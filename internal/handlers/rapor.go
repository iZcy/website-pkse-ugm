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
	tmpl := template.Must(template.New("rapor").Funcs(funcMap).ParseGlob("templates/rapor.html"))
	return &RaporHandler{tmpl: tmpl}
}

func (rh *RaporHandler) View(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := strings.TrimPrefix(r.URL.Path, "/rapor/t/")
	if token == "" {
		http.Error(w, "token required", http.StatusBadRequest)
		return
	}

	entry, err := db.GetRaporEntryByToken(token)
	if err != nil {
		http.Error(w, "Rapor tidak ditemukan", http.StatusNotFound)
		return
	}

	if !entry.Published {
		http.Error(w, "Rapor belum dipublikasikan", http.StatusForbidden)
		return
	}

	instance, err := db.GetRaporInstanceByID(entry.InstanceID.Hex())
	if err != nil {
		http.Error(w, "Instance tidak ditemukan", http.StatusInternalServerError)
		return
	}

	member, err := db.GetMemberByID(entry.MemberID.Hex())
	if err != nil {
		http.Error(w, "Member tidak ditemukan", http.StatusInternalServerError)
		return
	}

	allEntries, _ := db.GetRaporEntriesForMember(entry.MemberID.Hex(), entry.PeriodLabel)
	type tabInstance struct {
		Title  string
		Token  string
		Active bool
	}
	var tabs []tabInstance
	for _, e := range allEntries {
		inst, err := db.GetRaporInstanceByID(e.InstanceID.Hex())
		if err != nil || !e.Published {
			continue
		}
		tabs = append(tabs, tabInstance{
			Title:  inst.Title,
			Token:  e.Token,
			Active: e.Token == token,
		})
	}

	scoreAspects := []struct {
		Index int
		Label string
		Desc  string
	}{
		{0, "Kedisiplinan", "Kehadiran dan keteraturan mengikuti kegiatan"},
		{1, "Keaktifan", "Partisipasi aktif dalam kegiatan organisasi"},
		{2, "Tanggung Jawab", "Pemenuhan tugas dan kewajiban"},
		{3, "Kerjasama", "Kemampuan bekerja dalam tim"},
		{4, "Inisiatif", "Proaktif dalam kontribusi dan ide"},
	}

	type scoreRow struct {
		Aspect string
		Desc   string
		Score  int
	}
	var scores []scoreRow
	for _, sa := range scoreAspects {
		s := 0
		if sa.Index < len(entry.Scores) {
			s = entry.Scores[sa.Index]
		}
		scores = append(scores, scoreRow{Aspect: sa.Label, Desc: sa.Desc, Score: s})
	}

	yayasanAtt, _ := db.GetMemberAttendanceCount(entry.MemberID.Hex(), entry.PeriodLabel, "yayasan", instance.ActivityStart, instance.ActivityEnd)
	yayasanTotal, _ := db.GetActivityCount(entry.PeriodLabel, "yayasan", instance.ActivityStart, instance.ActivityEnd)
	paguyubanAtt, _ := db.GetMemberAttendanceCount(entry.MemberID.Hex(), entry.PeriodLabel, "paguyuban", instance.ActivityStart, instance.ActivityEnd)
	paguyubanTotal, _ := db.GetActivityCount(entry.PeriodLabel, "paguyuban", instance.ActivityStart, instance.ActivityEnd)
	lintasAtt, _ := db.GetMemberAttendanceCount(entry.MemberID.Hex(), entry.PeriodLabel, "lintas", instance.ActivityStart, instance.ActivityEnd)
	lintasTotal, _ := db.GetActivityCount(entry.PeriodLabel, "lintas", instance.ActivityStart, instance.ActivityEnd)

	data := map[string]any{
		"Member":     member,
		"Instance":   instance,
		"Entry":      entry,
		"Tabs":       tabs,
		"Scores":     scores,
		"Feedback":   entry.Feedback,
		"YayasanAtt": yayasanAtt,
		"YayasanTot": yayasanTotal,
		"PaguyAtt":   paguyubanAtt,
		"PaguyTot":   paguyubanTotal,
		"LintasAtt":  lintasAtt,
		"LintasTot":  lintasTotal,
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := rh.tmpl.ExecuteTemplate(w, "rapor.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
