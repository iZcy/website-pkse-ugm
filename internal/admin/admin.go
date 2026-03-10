package admin

import (
	"net/http"
	"text/template"

	"webapp/internal/auth"
	"webapp/internal/db"
)

var tmpl *template.Template

func Init() {
	tmpl = template.Must(template.ParseGlob("templates/admin-panel/*.html"))
}

func Login(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := auth.GetSessionUser(r); ok {
		http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
		return
	}
	errMsg := ""
	if r.Method == "POST" {
		r.ParseForm()
		username := r.FormValue("username")
		password := r.FormValue("password")
		user, err := db.GetUserByUsername(username)
		if err == nil && auth.CheckPassword(user.PasswordHash, password) {
			auth.SetSession(w, user.Username, user.Role)
			http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
			return
		}
		errMsg = "Username atau kata sandi salah."
	}
	tmpl.ExecuteTemplate(w, "login.html", map[string]interface{}{"Error": errMsg})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	auth.ClearSession(w)
	http.Redirect(w, r, "/admin", http.StatusFound)
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
	username, role, ok := auth.GetSessionUser(r)
	if !ok {
		http.Redirect(w, r, "/admin", http.StatusFound)
		return
	}
	tab := r.URL.Query().Get("tab")
	if tab == "" {
		tab = "pengumuman"
	}
	tmpl.ExecuteTemplate(w, "dashboard.html", map[string]interface{}{
		"Tab":      tab,
		"Username": username,
		"Role":     role,
	})
}
