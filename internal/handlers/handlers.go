package handlers

import (
"encoding/json"
"log"
"net/http"
"text/template"

"webapp/internal/db"
)

type Handler struct {
templates *template.Template
}

func New() *Handler {
tmpl := template.Must(template.ParseGlob("templates/*.html"))
return &Handler{templates: tmpl}
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
if r.URL.Path != "/" {
http.NotFound(w, r)
return
}
data := map[string]interface{}{"Title": "Beranda"}

ss, err := db.GetSiteSetting()
if err != nil {
log.Printf("db GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

announcements, err := db.GetAnnouncements(5, true)
if err != nil {
log.Printf("db GetAnnouncements: %v", err)
} else {
items := make([]map[string]interface{}, 0, len(announcements))
for _, a := range announcements {
items = append(items, map[string]interface{}{
"ID":        a.ID.Hex(),
"Title":     a.Title,
"Content":   a.Content,
"CreatedAt": a.CreatedAt.Format("2006-01-02"),
})
}
data["Announcements"] = items
}

h.templates.ExecuteTemplate(w, "index.html", data)
}

func (h *Handler) About(w http.ResponseWriter, r *http.Request) {
data := map[string]interface{}{"Title": "Tentang Kami"}

ss, err := db.GetSiteSetting()
if err != nil {
log.Printf("db GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

depts, err := db.GetDepartments()
if err != nil {
log.Printf("db GetDepartments: %v", err)
} else {
data["Departments"] = depts
}

officers, err := db.GetOfficers()
if err != nil {
log.Printf("db GetOfficers: %v", err)
} else {
var inti []db.Officer
var dept []db.Officer
for _, o := range officers {
if o.Tier == "departemen" {
dept = append(dept, o)
} else {
inti = append(inti, o)
}
}
data["IntiOfficers"] = inti
data["DeptOfficers"] = dept
}

h.templates.ExecuteTemplate(w, "about.html", data)
}

func (h *Handler) Announcements(w http.ResponseWriter, r *http.Request) {
data := map[string]interface{}{"Title": "Pengumuman"}
h.templates.ExecuteTemplate(w, "announcements.html", data)
}

func (h *Handler) Contact(w http.ResponseWriter, r *http.Request) {
data := map[string]interface{}{"Title": "Hubungi Kami"}
h.templates.ExecuteTemplate(w, "contact.html", data)
}

func (h *Handler) AnnouncementsAPI(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")

announcements, err := db.GetAnnouncements(0, true)
if err != nil {
log.Printf("db GetAnnouncements: %v", err)
json.NewEncoder(w).Encode([]interface{}{})
return
}

results := make([]map[string]interface{}, 0, len(announcements))
for _, a := range announcements {
results = append(results, map[string]interface{}{
"id":         a.ID.Hex(),
"title":      a.Title,
"content":    a.Content,
"created_at": a.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
})
}
json.NewEncoder(w).Encode(results)
}
