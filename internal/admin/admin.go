package admin

import (
	"html/template"
	"net/http"
	"path/filepath"

	"webapp/internal/auth"
	"webapp/internal/db"
)

var tmpl *template.Template

func Init() {
	var err error
	tmpl, err = template.ParseGlob(filepath.Join("templates", "admin-panel", "*.html"))
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
		if u, _, ok := auth.ResolveSession(w, r); ok && u != "" {
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
			w.WriteHeader(http.StatusUnauthorized)
			tmpl.ExecuteTemplate(w, "login.html", map[string]any{
				"Error":         "Username atau password salah.",
				"GlobalSetting": globalSetting,
			})
			return
		}
		auth.SetSession(w, u.Username, u.Role)
		http.Redirect(w, r, "/admin/pengumuman", http.StatusFound)
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
