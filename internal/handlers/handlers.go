package handlers

import (
"encoding/json"
"log"
"net/http"
"text/template"

"webapp/internal/strapi"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
strapi    *strapi.Client
templates *template.Template
}

// New returns a Handler backed by the given Strapi client.
func New(sc *strapi.Client) *Handler {
tmpl := template.Must(template.ParseGlob("templates/*.html"))
return &Handler{
strapi:    sc,
templates: tmpl,
}
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
if r.URL.Path != "/" {
http.NotFound(w, r)
return
}

data := map[string]interface{}{
"Title": "Beranda",
}

// Fetch site settings for homepage stats
ss, err := h.strapi.GetSiteSetting()
if err != nil {
log.Printf("strapi GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

// Fetch latest announcements
announcements, err := h.strapi.GetAnnouncements(5)
if err != nil {
log.Printf("strapi GetAnnouncements: %v", err)
} else {
items := make([]map[string]interface{}, 0, len(announcements))
for _, a := range announcements {
items = append(items, map[string]interface{}{
"ID":        a.ID,
"Title":     a.Title,
"Content":   a.Content,
"CreatedAt": a.CreatedAt,
})
}
data["Announcements"] = items
}

h.templates.ExecuteTemplate(w, "index.html", data)
}

func (h *Handler) About(w http.ResponseWriter, r *http.Request) {
data := map[string]interface{}{"Title": "Tentang Kami"}

// Site settings (sejarah, visi, misi, stats)
ss, err := h.strapi.GetSiteSetting()
if err != nil {
log.Printf("strapi GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

// Departments
depts, err := h.strapi.GetDepartments()
if err != nil {
log.Printf("strapi GetDepartments: %v", err)
} else {
data["Departments"] = depts
}

// Officers — split into inti and departemen
officers, err := h.strapi.GetOfficers()
if err != nil {
log.Printf("strapi GetOfficers: %v", err)
} else {
var inti []strapi.Officer
var dept []strapi.Officer
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

// AnnouncementsAPI proxies Strapi announcements as JSON.
func (h *Handler) AnnouncementsAPI(w http.ResponseWriter, r *http.Request) {
w.Header().Set("Content-Type", "application/json")

announcements, err := h.strapi.GetAllAnnouncements()
if err != nil {
log.Printf("strapi GetAllAnnouncements: %v", err)
json.NewEncoder(w).Encode([]interface{}{})
return
}

results := make([]map[string]interface{}, 0, len(announcements))
for _, a := range announcements {
results = append(results, map[string]interface{}{
"id":         a.ID,
"title":      a.Title,
"content":    a.Content,
"created_at": a.CreatedAt,
})
}
json.NewEncoder(w).Encode(results)
}
