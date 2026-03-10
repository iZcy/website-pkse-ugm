package admin

import (
"net/http"
"os"
"text/template"

"webapp/internal/auth"
)

var (
adminPassword string
tmpl          *template.Template
)

func Init() {
adminPassword = os.Getenv("ADMIN_PASSWORD")
if adminPassword == "" {
adminPassword = "admin123"
}
tmpl = template.Must(template.ParseGlob("templates/admin-panel/*.html"))
}

func Login(w http.ResponseWriter, r *http.Request) {
if auth.IsLoggedIn(r) {
http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
return
}
errMsg := ""
if r.Method == "POST" {
r.ParseForm()
if r.FormValue("password") == adminPassword {
auth.SetSession(w)
http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
return
}
errMsg = "Kata sandi salah."
}
tmpl.ExecuteTemplate(w, "login.html", map[string]interface{}{"Error": errMsg})
}

func Logout(w http.ResponseWriter, r *http.Request) {
auth.ClearSession(w)
http.Redirect(w, r, "/admin", http.StatusFound)
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
if !auth.IsLoggedIn(r) {
http.Redirect(w, r, "/admin", http.StatusFound)
return
}
tab := r.URL.Query().Get("tab")
if tab == "" {
tab = "pengumuman"
}
tmpl.ExecuteTemplate(w, "dashboard.html", map[string]interface{}{"Tab": tab})
}
