package handlers

import (
"encoding/json"
"html/template"
"net/http"
"strings"

"webapp/internal/db"
)

type Handler struct {
tmpl *template.Template
}

func New() *Handler {
funcMap := template.FuncMap{
    "add": func(a, b int) int { return a + b },
    "sub": func(a, b int) int { return a - b },
    "mod": func(a, b int) int { return a % b },
}
tmpl := template.Must(template.New("").Funcs(funcMap).ParseGlob("templates/*.html"))
return &Handler{tmpl: tmpl}
}

func (h *Handler) baseData() map[string]any {
gs, _ := db.GetGlobalSetting()
if gs == nil {
gs = &db.GlobalSetting{OrgName: "PKSE UGM"}
}
activePeriod, _ := db.GetActivePeriod()
return map[string]any{
"GlobalSetting": gs,
"ActivePeriod":  activePeriod,
}
}

func (h *Handler) activePeriodLabel() string {
p, err := db.GetActivePeriod()
if err != nil || p == nil {
return ""
}
return p.Label
}

func (h *Handler) render(w http.ResponseWriter, name string, data map[string]any) {
w.Header().Set("Content-Type", "text/html; charset=utf-8")
if err := h.tmpl.ExecuteTemplate(w, name, data); err != nil {
http.Error(w, "Template error: "+err.Error(), 500)
}
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
if r.URL.Path != "/" {
http.NotFound(w, r)
return
}
data := h.baseData()
pl := h.activePeriodLabel()
announcements, _ := db.GetAnnouncements(5, true, pl)
data["Announcements"] = announcements
arts, _ := db.GetArticles(true, pl)
if len(arts) > 3 {
arts = arts[:3]
}
data["Articles"] = arts
periodAbout, _ := db.GetPeriodAbout(pl)
data["PeriodAbout"] = periodAbout
depts, _ := db.GetDepartments(pl)
data["Departments"] = depts
members, _ := db.GetMembers(pl)
if len(members) > 8 {
members = members[:8]
}
data["Members"] = members
h.render(w, "index.html", data)
}

func (h *Handler) TentangKami(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
pl := h.activePeriodLabel()
periodAbout, _ := db.GetPeriodAbout(pl)
data["PeriodAbout"] = periodAbout
h.render(w, "tentang-kami.html", data)
}

func (h *Handler) Anggota(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
sel := r.URL.Query().Get("period")
if sel == "" {
sel = h.activePeriodLabel()
}
data["SelectedPeriod"] = sel
members, _ := db.GetMembers(sel)
data["Members"] = members
periods, _ := db.GetPeriods()
data["Periods"] = periods
depts, _ := db.GetDepartments(sel)
data["Departments"] = depts
h.render(w, "anggota.html", data)
}

func (h *Handler) Artikel(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
filterPeriod := r.URL.Query().Get("period")
if filterPeriod == "" {
filterPeriod = h.activePeriodLabel()
}
data["FilterPeriod"] = filterPeriod
articles, _ := db.GetArticles(true, filterPeriod)
data["Articles"] = articles
periods, _ := db.GetPeriods()
data["Periods"] = periods
h.render(w, "artikel.html", data)
}

func (h *Handler) ArtikelDetail(w http.ResponseWriter, r *http.Request) {
slug := strings.Trim(strings.TrimPrefix(r.URL.Path, "/artikel/"), "/")
if slug == "" {
http.Redirect(w, r, "/artikel", http.StatusFound)
return
}
article, err := db.GetArticleBySlug(slug)
if err != nil {
http.NotFound(w, r)
return
}
data := h.baseData()
data["Article"] = article
h.render(w, "artikel-detail.html", data)
}

func (h *Handler) Pengumuman(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
filterPeriod := r.URL.Query().Get("period")
if filterPeriod == "" {
filterPeriod = h.activePeriodLabel()
}
data["FilterPeriod"] = filterPeriod
announcements, _ := db.GetAnnouncements(0, true, filterPeriod)
data["Announcements"] = announcements
periods, _ := db.GetPeriods()
data["Periods"] = periods
h.render(w, "pengumuman.html", data)
}

func (h *Handler) Periode(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
periods, _ := db.GetPeriods()
data["Periods"] = periods
h.render(w, "periode.html", data)
}

func (h *Handler) PeriodeDetail(w http.ResponseWriter, r *http.Request) {
label := strings.Trim(strings.TrimPrefix(r.URL.Path, "/periode/"), "/")
if label == "" {
http.Redirect(w, r, "/periode", http.StatusFound)
return
}
period, err := db.GetPeriodByLabel(label)
if err != nil {
http.NotFound(w, r)
return
}
data := h.baseData()
data["Period"] = period
periodAbout, _ := db.GetPeriodAbout(label)
data["PeriodAbout"] = periodAbout
members, _ := db.GetMembers(label)
data["Members"] = members
depts, _ := db.GetDepartments(label)
data["Departments"] = depts
h.render(w, "periode-detail.html", data)
}

func (h *Handler) AnnouncementsAPI(w http.ResponseWriter, r *http.Request) {
pl := h.activePeriodLabel()
items, err := db.GetAnnouncements(10, true, pl)
if err != nil {
http.Error(w, err.Error(), 500)
return
}
w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(items)
}

func (h *Handler) Program(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
sel := r.URL.Query().Get("period")
if sel == "" {
    sel = h.activePeriodLabel()
}
data["SelectedPeriod"] = sel
items, _ := db.GetPrograms(sel)
data["Programs"] = items
periods, _ := db.GetPeriods()
data["Periods"] = periods
h.render(w, "program.html", data)
}

func (h *Handler) FAQ(w http.ResponseWriter, r *http.Request) {
	data := h.baseData()
	sel := h.activePeriodLabel()
	data["SelectedPeriod"] = sel
	
	itemsPeriod, _ := db.GetFAQs(sel)
	itemsGlobal, _ := db.GetFAQs("GLOBAL")
	
	var combined []db.FAQ
	combined = append(combined, itemsPeriod...)
	combined = append(combined, itemsGlobal...)
	
	data["FAQs"] = combined
	// we do NOT provide data["Periods"] so frontend won't have a selector (if it relies on it)
	h.render(w, "faq.html", data)
}

func (h *Handler) Statistik(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
sel := r.URL.Query().Get("period")
if sel == "" {
    sel = h.activePeriodLabel()
}
data["SelectedPeriod"] = sel
items, _ := db.GetStats(sel)
data["Stats"] = items
periods, _ := db.GetPeriods()
data["Periods"] = periods
h.render(w, "statistik.html", data)
}

func (h *Handler) Alumni(w http.ResponseWriter, r *http.Request) {
data := h.baseData()
h.render(w, "alumni.html", data)
}
