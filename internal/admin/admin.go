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

func Login(w http.ResponseWriter, r *http.Request) {
	globalSetting, _ := db.GetGlobalSetting()

	if r.Method == http.MethodGet {
		if u, _, ok := auth.ResolveSession(w, r); ok && u != "" {
			http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
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
		http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
		return
	}

	tmpl.ExecuteTemplate(w, "login.html", map[string]any{"GlobalSetting": globalSetting})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(w)
	http.Redirect(w, r, "/login", http.StatusFound)
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
	username, role, ok := auth.ResolveSession(w, r)
	if !ok || username == "" {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

	u, err := db.GetUserByUsername(username)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
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

	data := map[string]any{
		"Username":          username,
		"Role":              role,
		"AccessiblePeriods": accessiblePeriods,
		"SelectedPeriod":    selectedPeriod,
		"GlobalSetting":     globalSetting,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.ExecuteTemplate(w, "dashboard.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
