package admin

import (
	"encoding/json"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"

	"webapp/internal/auth"
	"webapp/internal/db"
)

var tmpl *template.Template

func Init() {
	var err error
	funcMap := template.FuncMap{
		"substr": func(s string, start, length int) string {
			rs := []rune(s)
			if start >= len(rs) { return "" }
			end := start + length
			if end > len(rs) { end = len(rs) }
			return string(rs[start:end])
		},
	}
	tmpl, err = template.New("admin").Funcs(funcMap).ParseGlob(filepath.Join("templates", "admin-panel", "*.html"))
	if err != nil {
		panic("admin template parse: " + err.Error())
	}
}

// adminData returns common data for all admin pages, or redirects to login.
// Returns nil if auth failed (response already sent).
func adminData(w http.ResponseWriter, r *http.Request, activeSection string) map[string]any {
	username, role, ok := auth.ResolveSession(w, r)
	if !ok || username == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return nil
	}
	u, err := db.GetUserByUsername(username)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return nil
	}
	// Authentication is not authorization: members are real users, so the admin
	// panel must check the role from the database, not just a valid session.
	role = u.Role
	if role != "admin" && role != "superadmin" {
		http.Redirect(w, r, "/member", http.StatusFound)
		return nil
	}
	var accessiblePeriods []db.Period
	allPeriods, _ := db.GetPeriods()
	if role == "superadmin" {
		accessiblePeriods = allPeriods
	} else {
		for _, p := range allPeriods {
			if p.Label == u.AssignedPeriod {
				accessiblePeriods = append(accessiblePeriods, p)
				break
			}
		}
	}
	selectedPeriod := r.URL.Query().Get("period")
	if role != "superadmin" {
		selectedPeriod = u.AssignedPeriod
	} else if selectedPeriod == "" && len(accessiblePeriods) > 0 {
		selectedPeriod = accessiblePeriods[0].Label
		for _, p := range accessiblePeriods {
			if p.IsActive {
				selectedPeriod = p.Label
				break
			}
		}
	}
	globalSetting, _ := db.GetGlobalSetting()
	return map[string]any{
		"Username":          username,
		"Role":              role,
		"AccessiblePeriods": accessiblePeriods,
		"SelectedPeriod":    selectedPeriod,
		"GlobalSetting":     globalSetting,
		"ActiveSection":     activeSection,
	}
}

func renderAdmin(w http.ResponseWriter, r *http.Request, templateName string, activeSection string) {
	data := adminData(w, r, activeSection)
	if data == nil {
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	if err := tmpl.ExecuteTemplate(w, templateName, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func Login(w http.ResponseWriter, r *http.Request) {
	globalSetting, _ := db.GetGlobalSetting()

	if r.Method == http.MethodGet {
		if u, role, ok := auth.ResolveSession(w, r); ok && u != "" {
			if role == "member" {
				http.Redirect(w, r, "/member", http.StatusFound)
				return
			}
			selectedPeriod := r.URL.Query().Get("period")
			http.Redirect(w, r, "/admin/pengumuman?period="+selectedPeriod, http.StatusFound)
			return
		}
	}

	if r.Method == http.MethodPost {
		username := r.FormValue("username")
		password := r.FormValue("password")
		u, err := db.GetUserByUsername(username)
		if err != nil || !auth.CheckPassword(u.PasswordHash, password) {
			// Try name-to-NIM lookup for members
			member, mErr := db.GetMemberByName(username)
			if mErr == nil && member != nil && member.NIM != "" {
				u, err = db.GetUserByUsername(member.NIM)
				if err != nil {
					// Auto-register: NIM as username and password
					hash, _ := auth.HashPassword(member.NIM)
					newUser := db.User{ID: member.NIM, Username: member.NIM, PasswordHash: hash, Role: "member"}
					if cErr := db.CreateUser(newUser); cErr == nil {
						u = &newUser
						err = nil
					}
				}
			}
			if err != nil || !auth.CheckPassword(u.PasswordHash, password) {
				w.WriteHeader(http.StatusUnauthorized)
				tmpl.ExecuteTemplate(w, "login.html", map[string]any{
					"Error":         "Username atau password salah.",
					"GlobalSetting": globalSetting,
				})
				return
			}
		}
		auth.SetSession(w, u.Username, u.Role)
		if u.Role == "member" {
			http.Redirect(w, r, "/member", http.StatusFound)
			return
		}
		allPeriods, _ := db.GetPeriods()
		selPeriod := ""
		for _, p := range allPeriods {
			if p.IsActive { selPeriod = p.Label; break }
		}
		if selPeriod == "" && len(allPeriods) > 0 {
			selPeriod = allPeriods[0].Label
		}
		http.Redirect(w, r, "/admin/pengumuman?period="+selPeriod, http.StatusFound)
		return
	}

	tmpl.ExecuteTemplate(w, "login.html", map[string]any{"GlobalSetting": globalSetting})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(w)
	http.Redirect(w, r, "/login", http.StatusFound)
}

// Dashboard redirects to pengumuman
func Dashboard(w http.ResponseWriter, r *http.Request) {
	selectedPeriod := r.URL.Query().Get("period")
	http.Redirect(w, r, "/admin/pengumuman?period="+selectedPeriod, http.StatusFound)
}

// Individual section handlers
func Pengumuman(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "pengumuman.html", "pengumuman") }
func Artikel(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "artikel.html", "artikel") }
func Departemen(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "departemen.html", "departemen") }
func Program(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "program.html", "program") }
func Tentang(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "tentang.html", "tentang") }
func Galeri(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "galeri.html", "galeri") }
func Statistik(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "statistik.html", "statistik") }
func Anggota(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "anggota.html", "anggota") }
func Global(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "global.html", "global") }
func Shortlink(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "shortlink.html", "shortlink") }
func Broadcast(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "broadcast.html", "broadcast") }
func FAQGlobal(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "faq-global.html", "faq-global") }
func GlobalStats(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "global-stats.html", "global-stats") }
func Periode(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "periode.html", "periode") }
func Akun(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "akun.html", "akun") }
func Activities(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "activities.html", "activities") }
func Rapor(w http.ResponseWriter, r *http.Request)      { renderAdmin(w, r, "rapor.html", "rapor") }
func RaporEntries(w http.ResponseWriter, r *http.Request) { renderAdmin(w, r, "rapor-entries.html", "rapor") }

func MemberDashboard(w http.ResponseWriter, r *http.Request) {
	username, role, ok := auth.ResolveSession(w, r)
	if !ok || role != "member" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	member, err := db.GetMemberByNIM(username)
	if err != nil {
		http.Error(w, "member not found", http.StatusNotFound)
		return
	}
	gs, _ := db.GetGlobalSetting()
	orgName := "PKSE UGM"
	if gs != nil && gs.OrgName != "" { orgName = gs.OrgName }
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmpl.ExecuteTemplate(w, "member-dashboard.html", map[string]any{
		"OrgName": orgName,
		"Member":  member,
		"MemberID": member.ID.Hex(),
	})
}

func MemberAPI(w http.ResponseWriter, r *http.Request) {
	uname, role, ok := auth.GetSessionUser(r)
	if !ok || role != "member" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(401)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
		return
	}
	member, err := db.GetMemberByNIM(uname)
	if err != nil {
		http.Error(w, "member not found", 404)
		return
	}

	seg := strings.TrimPrefix(r.URL.Path, "/api/member")
	seg = strings.Trim(seg, "/")

	switch {
	case seg == "profile":
		allPeriods, _ := db.GetPeriods()
		periodDisplay := map[string]string{}
		for _, p := range allPeriods { periodDisplay[p.Label] = p.DisplayName }
		type kepengurusanItem struct {
			Period     string `json:"period"`
			PeriodName string `json:"period_name"`
			SubPeriod  string `json:"sub_period"`
			Department string `json:"department"`
			Position   string `json:"position"`
		}
		var kepengurusan []kepengurusanItem
		ap := member.ActivePeriods
		if ap == nil { ap = map[string]string{} }
		for periodLabel, subPeriod := range ap {
			pos := "Anggota"
			if member.ActivePositions != nil {
				if p, ok := member.ActivePositions[periodLabel]; ok && p != "" { pos = p }
			}
			if pos == "Anggota" && member.Position != "" { pos = member.Position }
			kepengurusan = append(kepengurusan, kepengurusanItem{
				Period:     periodLabel,
				PeriodName: periodDisplay[periodLabel],
				SubPeriod:  subPeriod,
				Department: member.Department,
				Position:   pos,
			})
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"full_name": member.FullName, "department": member.Department,
			"program_studi": member.ProgramStudi, "nim": member.NIM,
			"angkatan": member.Angkatan, "fakultas": member.Fakultas,
			"photo_url": member.PhotoURL, "rapor_id": member.ID.Hex(),
			"position": member.Position, "phone": member.Phone,
			"nickname": member.Nickname,
			"kepengurusan": kepengurusan,
		})
	case seg == "change-password" && r.Method == "POST":
		var body struct {
			Old string `json:"old"`
			New string `json:"new"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(400)
			json.NewEncoder(w).Encode(map[string]string{"error": "bad request"})
			return
		}
		u, err := db.GetUserByUsername(uname)
		if err != nil || !auth.CheckPassword(u.PasswordHash, body.Old) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(403)
			json.NewEncoder(w).Encode(map[string]string{"error": "Password lama salah"})
			return
		}
		hash, _ := auth.HashPassword(body.New)
		if err := db.UpdateUser(u.ID, map[string]any{"password_hash": hash}); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(500)
			json.NewEncoder(w).Encode(map[string]string{"error": "gagal"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"ok": "true"})
	default:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(404)
		json.NewEncoder(w).Encode(map[string]string{"error": "not found"})
	}
}

func SessionAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	uname, role, ok := auth.GetSessionUser(r)
	if !ok {
		json.NewEncoder(w).Encode(map[string]string{"role": ""})
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"username": uname, "role": role})
}
