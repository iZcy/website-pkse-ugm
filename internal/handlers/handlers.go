package handlers

import (
"encoding/json"
"log"
"net/http"
"strings"
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

func activePeriod() string {
p, err := db.GetActivePeriod()
if err != nil {
return ""
}
return p.Label
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
if r.URL.Path != "/" {
http.NotFound(w, r)
return
}
pid := activePeriod()
data := map[string]interface{}{"Title": "Beranda"}

if ss, err := db.GetSiteSetting(pid); err != nil {
log.Printf("db GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

if announcements, err := db.GetAnnouncements(5, true, pid); err != nil {
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

if articles, err := db.GetArticles(true, pid); err != nil {
log.Printf("db GetArticles: %v", err)
} else {
data["Articles"] = articles
}

h.templates.ExecuteTemplate(w, "index.html", data)
}

func (h *Handler) About(w http.ResponseWriter, r *http.Request) {
pid := activePeriod()
data := map[string]interface{}{"Title": "Tentang Kami"}

if ss, err := db.GetSiteSetting(pid); err != nil {
log.Printf("db GetSiteSetting: %v", err)
} else {
data["SiteSetting"] = ss
}

if depts, err := db.GetDepartments(pid); err != nil {
log.Printf("db GetDepartments: %v", err)
} else {
data["Departments"] = depts
}

if officers, err := db.GetOfficers(pid); err != nil {
log.Printf("db GetOfficers: %v", err)
} else {
var inti, dept []db.Officer
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
h.templates.ExecuteTemplate(w, "announcements.html", map[string]interface{}{"Title": "Pengumuman"})
}

func (h *Handler) Articles(w http.ResponseWriter, r *http.Request) {
pid := activePeriod()
data := map[string]interface{}{"Title": "Artikel"}
if articles, err := db.GetArticles(true, pid); err != nil {
log.Printf("db GetArticles: %v", err)
} else {
data["Articles"] = articles
}
h.templates.ExecuteTemplate(w, "articles.html", data)
}

func (h *Handler) ArticleDetail(w http.ResponseWriter, r *http.Request) {
slug := strings.TrimPrefix(r.URL.Path, "/artikel/")
if slug == "" {
http.Redirect(w, r, "/artikel", http.StatusFound)
return
}
article, err := db.GetArticleBySlug(slug)
if err != nil || !article.Published {
http.NotFound(w, r)
return
}
h.templates.ExecuteTemplate(w, "article-detail.html", map[string]interface{}{
"Title":   article.Title,
"Article": article,
})
}

func (h *Handler) Contact(w http.ResponseWriter, r *http.Request) {
h.templates.ExecuteTemplate(w, "contact.html", map[string]interface{}{"Title": "Hubungi Kami"})
}

func (h *Handler) AnnouncementsAPI(w http.ResponseWriter, r *http.Request) {
pid := activePeriod()
w.Header().Set("Content-Type", "application/json")
announcements, err := db.GetAnnouncements(0, true, pid)
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
