package handlers

import (
	"html/template"
	"net/http"
	"strings"

	"webapp/internal/db"
)

type RaporHandler struct {
	tmpl *template.Template
}

func NewRaporHandler() *RaporHandler {
	funcMap := template.FuncMap{
		"mul":     func(a, b int) int { return a * b },
		"safeHTML": func(s string) template.HTML { return template.HTML(s) },
		"substr":  func(s string, start, length int) string {
			runes := []rune(s)
			if start >= len(runes) { return "" }
			end := start + length
			if end > len(runes) { end = len(runes) }
			return string(runes[start:end])
		},
	}
	tmpl := template.Must(template.New("rapor").Funcs(funcMap).ParseGlob("templates/rapor*.html"))
	return &RaporHandler{tmpl: tmpl}
}

func (rh *RaporHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		rh.tmpl.ExecuteTemplate(w, "rapor-login.html", nil)
		return
	}
	if r.Method == http.MethodPost {
		fullName := strings.TrimSpace(r.FormValue("full_name"))
		nim := strings.TrimSpace(r.FormValue("nim"))
		if fullName == "" || nim == "" {
			rh.tmpl.ExecuteTemplate(w, "rapor-login.html", map[string]string{"Error": "Nama dan NIM wajib diisi."})
			return
		}
		member, err := db.FindMemberByNIM(nim, fullName)
		if err != nil || member == nil {
			rh.tmpl.ExecuteTemplate(w, "rapor-login.html", map[string]string{"Error": "Data tidak ditemukan. Periksa kembali nama dan NIM."})
			return
		}
		http.Redirect(w, r, "/rapor/m/"+member.ID.Hex(), http.StatusFound)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor-login.html", nil)
}

func (rh *RaporHandler) Member(w http.ResponseWriter, r *http.Request) {
	memberID := strings.TrimPrefix(r.URL.Path, "/rapor/m/")
	if memberID == "" {
		http.Redirect(w, r, "/rapor", http.StatusFound)
		return
	}
	member, err := db.GetMemberByID(memberID)
	if err != nil {
		rh.renderError(w, "Anggota tidak ditemukan.")
		return
	}
	entries, _ := db.GetRaporEntriesForMember(memberID, "")
	type entryCard struct {
		InstanceTitle string
		PeriodLabel   string
		Token         string
		Scores        []int
		Feedback      string
		Published     bool
	}
	var cards []entryCard
	for _, e := range entries {
		if !e.Published { continue }
		inst, _ := db.GetRaporInstanceByID(e.InstanceID.Hex())
		title := "Rapor"
		if inst != nil { title = inst.Title }
		cards = append(cards, entryCard{
			InstanceTitle: title,
			PeriodLabel:   e.PeriodLabel,
			Token:         e.Token,
			Scores:        e.Scores,
			Feedback:      e.Feedback,
			Published:     e.Published,
		})
	}
	gs, _ := db.GetGlobalSetting()
	orgName := "PKSE UGM"
	if gs != nil && gs.OrgName != "" { orgName = gs.OrgName }
	data := map[string]any{
		"OrgName": orgName,
		"Member":  member,
		"Entries": cards,
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor-member.html", data)
}

func (rh *RaporHandler) View(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.URL.Path, "/rapor/t/")
	if token == "" {
		http.Error(w, "token required", http.StatusBadRequest)
		return
	}
	entry, err := db.GetRaporEntryByToken(token)
	if err != nil {
		rh.renderError(w, "Rapor tidak ditemukan atau belum dipublikasikan.")
		return
	}
	if !entry.Published {
		rh.renderError(w, "Rapor belum dipublikasikan.")
		return
	}
	instance, err := db.GetRaporInstanceByID(entry.InstanceID.Hex())
	if err != nil {
		rh.renderError(w, "Data rapor tidak lengkap.")
		return
	}
	member, err := db.GetMemberByID(entry.MemberID.Hex())
	if err != nil {
		rh.renderError(w, "Data member tidak ditemukan.")
		return
	}
	gs, _ := db.GetGlobalSetting()
	orgName := "PKSE UGM"
	if gs != nil && gs.OrgName != "" { orgName = gs.OrgName }
	allEntries, _ := db.GetRaporEntriesForMember(entry.MemberID.Hex(), entry.PeriodLabel)
	type tabItem struct {
		Title  string
		Token  string
		Active bool
	}
	var allInstances []tabItem
	for _, e := range allEntries {
		inst, _ := db.GetRaporInstanceByID(e.InstanceID.Hex())
		if !e.Published { continue }
		allInstances = append(allInstances, tabItem{Title: inst.Title, Token: e.Token, Active: e.Token == token})
	}
	type scoreItem struct {
		Aspect string
		Desc   string
		Score  int
	}
	aspects := []struct{ Index int; Label string; Desc string }{
		{0, "Kedisiplinan & Komitmen", "Kehadiran dan keteraturan mengikuti kegiatan"},
		{1, "Keaktifan", "Partisipasi aktif dalam kegiatan organisasi"},
		{2, "Tanggung Jawab", "Pemenuhan tugas dan kewajiban"},
		{3, "Kerjasama", "Kemampuan bekerja dalam tim"},
		{4, "Inisiatif", "Proaktif dalam kontribusi dan ide"},
	}
	var scoreItems []scoreItem
	for _, sa := range aspects {
		s := 0
		if sa.Index < len(entry.Scores) { s = entry.Scores[sa.Index] }
		scoreItems = append(scoreItems, scoreItem{Aspect: sa.Label, Desc: sa.Desc, Score: s})
	}
	activities, _ := db.GetActivitiesByDateRange(entry.PeriodLabel, "", instance.ActivityStart, instance.ActivityEnd)
	type actItem struct {
		Name     string
		Attended bool
	}
	catActs := map[string][]actItem{}
	present, total := 0, 0
	for _, a := range activities {
		attended := false
		for _, aid := range a.AttendeeIDs {
			if aid == entry.MemberID { attended = true; break }
		}
		cat := a.Category
		if cat == "" { cat = "Lainnya" }
		catActs[cat] = append(catActs[cat], actItem{Name: a.Name, Attended: attended})
		total++
		if attended { present++ }
	}
	absent := total - present
	pct := 0
	if total > 0 { pct = present * 100 / total }
	data := map[string]any{
		"OrgName":             orgName,
		"Member":              member,
		"Instance":            instance,
		"Entry":               entry,
		"AllInstances":        allInstances,
		"ScoreItems":          scoreItems,
		"AttendanceSummary":   map[string]any{"Present": present, "Absent": absent, "Total": total, "Percentage": pct},
		"ActivitiesByCategory": catActs,
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor.html", data)
}

func (rh *RaporHandler) renderError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor.html", map[string]any{"Error": msg})
}
