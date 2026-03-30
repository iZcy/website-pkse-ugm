package handlers

import (
	"encoding/json"
	"html/template"
	"net/http"
	"strings"
	"time"

	"webapp/internal/db"
)

type Handler struct {
	tmpl *template.Template
}

type PeriodDepartmentGroup struct {
	Department db.Department
	Members    []db.Member
	Programs   []db.Program
	Children   []PeriodDepartmentGroup
}

func New() *Handler {
	funcMap := template.FuncMap{
		"add": func(a, b int) int { return a + b },
		"sub": func(a, b int) int { return a - b },
		"mod": func(a, b int) int { return a % b },
		"safeHTML": func(s string) template.HTML { return template.HTML(s) },
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
		"CurrentYear":   time.Now().Year(),
	}
}

func groupByDepartment(depts []db.Department, members []db.Member, programs []db.Program) ([]PeriodDepartmentGroup, []db.Program) {
	usedPrograms := map[string]bool{}
	nodeMap := make(map[string]*PeriodDepartmentGroup)

	// First pass: create all nodes and attach members/programs
	for _, d := range depts {
		g := PeriodDepartmentGroup{Department: d}
		for _, m := range members {
			if strings.EqualFold(strings.TrimSpace(m.Department), strings.TrimSpace(d.Name)) {
				g.Members = append(g.Members, m)
			}
		}
		for _, p := range programs {
			if strings.EqualFold(strings.TrimSpace(p.Department), strings.TrimSpace(d.Name)) {
				g.Programs = append(g.Programs, p)
				usedPrograms[p.ID.Hex()] = true
			}
		}
		nodeMap[d.ID.Hex()] = &g
	}

	// Second pass: build tree by linking children to parents (via pointers)
	var rootPtrs []*PeriodDepartmentGroup
	for _, d := range depts {
		node := nodeMap[d.ID.Hex()]
		if d.ParentID == nil {
			rootPtrs = append(rootPtrs, node)
		} else {
			if parent, ok := nodeMap[d.ParentID.Hex()]; ok {
				parent.Children = append(parent.Children, *node)
			} else {
				rootPtrs = append(rootPtrs, node)
			}
		}
	}

	// Copy root pointers into result slice (tree already built via pointer mutations)
	roots := make([]PeriodDepartmentGroup, 0, len(rootPtrs))
	for _, r := range rootPtrs {
		roots = append(roots, *r)
	}

	// Compute ungrouped programs
	var ungrouped []db.Program
	for _, p := range programs {
		if !usedPrograms[p.ID.Hex()] {
			ungrouped = append(ungrouped, p)
		}
	}

	return roots, ungrouped
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
	programs, _ := db.GetPrograms(pl)
	groups, ungrouped := groupByDepartment(depts, members, programs)
	data["DepartmentGroups"] = groups
	data["UngroupedPrograms"] = ungrouped
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
	depts, _ := db.GetDepartments(pl)
	members, _ := db.GetMembers("")
	programs, _ := db.GetPrograms(pl)
	groups, _ := groupByDepartment(depts, members, programs)
	data["DepartmentGroups"] = groups
	h.render(w, "tentang-kami.html", data)
}

func (h *Handler) Anggota(w http.ResponseWriter, r *http.Request) {
	data := h.baseData()
	sel := r.URL.Query().Get("period")
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
	depts, _ := db.GetDepartments(label)
	articles, _ := db.GetArticles(true, label)
	stats, _ := db.GetStats(label)
	programs, _ := db.GetPrograms(label)

	groups, ungroupedPrograms := groupByDepartment(depts, members, programs)

	visibleStats := make([]db.StatData, 0, len(stats))
	for _, s := range stats {
		if s.Visible {
			visibleStats = append(visibleStats, s)
		}
	}

	data["Articles"] = articles
	data["Stats"] = visibleStats
	data["DepartmentGroups"] = groups
	data["UngroupedPrograms"] = ungroupedPrograms
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
	depts, _ := db.GetDepartments(sel)

	groups, ungrouped := groupByDepartment(depts, nil, items)

	data["DepartmentGroups"] = groups
	data["UngroupedPrograms"] = ungrouped
	data["Programs"] = items
	periods, _ := db.GetPeriods()
	data["Periods"] = periods
	h.render(w, "program.html", data)
}

func (h *Handler) FAQ(w http.ResponseWriter, r *http.Request) {
	data := h.baseData()
	sel := h.activePeriodLabel()
	data["SelectedPeriod"] = sel

	var combined []db.FAQ
	seen := map[string]bool{}
	appendFAQ := func(items []db.FAQ) {
		for _, item := range items {
			key := strings.TrimSpace(strings.ToLower(item.Question)) + "|" + strings.TrimSpace(strings.ToLower(item.Answer))
			if key == "|" {
				if item.ID.Hex() != "" {
					key = item.ID.Hex()
				} else {
					key = item.Question + item.Answer
				}
			}
			if seen[key] {
				continue
			}
			seen[key] = true
			combined = append(combined, item)
		}
	}
	if sel != "" {
		itemsPeriod, _ := db.GetFAQs(sel)
		appendFAQ(itemsPeriod)
	}
	itemsGlobal, _ := db.GetFAQs("GLOBAL")
	appendFAQ(itemsGlobal)
	data["FAQs"] = combined
	// we do NOT provide data["Periods"] so frontend won't have a selector (if it relies on it)
	h.render(w, "faq.html", data)
}

func (h *Handler) ShortLinkRedirect(w http.ResponseWriter, r *http.Request) {
	code := strings.Trim(strings.TrimPrefix(r.URL.Path, "/l/"), "/")
	if code == "" {
		http.NotFound(w, r)
		return
	}
	item, err := db.GetShortLinkByCode(code)
	if err != nil || item == nil || item.TargetURL == "" {
		http.NotFound(w, r)
		return
	}
	http.Redirect(w, r, item.TargetURL, http.StatusFound)
}

func (h *Handler) Statistik(w http.ResponseWriter, r *http.Request) {
        data := h.baseData()
        sel := r.URL.Query().Get("period")
        if sel == "" {
                sel = h.activePeriodLabel()
        }
        data["SelectedPeriod"] = sel

        templates, _ := db.GetStats("_TEMPLATE_")
        values, _ := db.GetStats(sel)
        byTemplate := make(map[string]db.StatData, len(values))
        for _, v := range values {
                if v.TemplateID != "" {
                        byTemplate[v.TemplateID] = v
                }
        }

        merged := make([]db.StatData, 0, len(templates))
        for _, t := range templates {
                if !t.Visible {
                        continue
                }
                tid := t.ID.Hex()
                if t.TemplateID != "" {
                        tid = t.TemplateID
                }
                item := t
                item.PeriodLabel = sel
                item.TemplateID = tid
                item.Value = ""
                if v, ok := byTemplate[tid]; ok {
                        item.ID = v.ID
                        item.Value = v.Value
                }
                merged = append(merged, item)
        }

        data["Stats"] = merged
        periods, _ := db.GetPeriods()
        data["Periods"] = periods
        h.render(w, "statistik.html", data)
}
func (h *Handler) Alumni(w http.ResponseWriter, r *http.Request) {
	data := h.baseData()
	h.render(w, "alumni.html", data)
}

func (h *Handler) Galeri(w http.ResponseWriter, r *http.Request) {
	data := h.baseData()
	selectedPeriod := r.URL.Query().Get("period")
	data["SelectedPeriod"] = selectedPeriod

	periods, _ := db.GetPeriods()
	data["Periods"] = periods

	type galleryPeriod struct {
		PeriodLabel  string
		DisplayName string
		Gallery      []db.GalleryItem
	}
	var gps []galleryPeriod
	for _, p := range periods {
		pa, err := db.GetPeriodAbout(p.Label)
		if err != nil || len(pa.Gallery) == 0 {
			continue
		}
		gps = append(gps, galleryPeriod{PeriodLabel: p.Label, DisplayName: p.DisplayName, Gallery: pa.Gallery})
	}
	data["GalleryPeriods"] = gps
	h.render(w, "galeri.html", data)
}

