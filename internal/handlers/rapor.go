package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"strconv"
	"html/template"
	"net/http"
	"strings"
	"time"

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

var raporSecret = []byte("pkse-rapor-secret-key-2026")

func generateRaporToken(memberID string) string {
	expiry := time.Now().Add(24 * time.Hour).Format(time.RFC3339)
	payload := memberID + ":" + expiry
	mac := hmac.New(sha256.New, raporSecret)
	mac.Write([]byte(payload))
	sig := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + sig
}

func verifyRaporToken(token, memberID string) bool {
	parts := strings.SplitN(token, ".", 2)
	if len(parts) != 2 { return false }
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil { return false }
	parts2 := strings.SplitN(string(payload), ":", 2)
	if len(parts2) != 2 || parts2[0] != memberID { return false }
	expiry, err := time.Parse(time.RFC3339, parts2[1])
	if err != nil || time.Now().After(expiry) { return false }
	mac := hmac.New(sha256.New, raporSecret)
	mac.Write(payload)
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(parts[1]), []byte(expected))
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
		token := generateRaporToken(member.ID.Hex())
		http.SetCookie(w, &http.Cookie{
			Name: "rapor_auth", Value: token, Path: "/rapor",
			HttpOnly: true, SameSite: http.SameSiteStrictMode,
		})
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
	cookie, err := r.Cookie("rapor_auth")
	if err != nil || !verifyRaporToken(cookie.Value, memberID) {
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
		Scores        []interface{}
		Feedback      string
		Published     bool
		NumericAvg    float64
		ScoreNums     []float64
		ActivityStart string
		ActivityEnd   string
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
			ActivityStart: func() string { if inst != nil { return inst.ActivityStart.Format("02 Jan 2006") }; return "" }(),
			ActivityEnd:   func() string { if inst != nil { return inst.ActivityEnd.Format("02 Jan 2006") }; return "" }(),
		})
		// Calculate numeric average for graph
		var sum float64
		var count int
		for _, s := range e.Scores {
			switch v := s.(type) {
			case float64: sum += v; count++
			case int: sum += float64(v); count++
			case int32: sum += float64(v); count++
			case int64: sum += float64(v); count++
			case string:
				if n, err := strconv.ParseFloat(v, 64); err == nil { sum += n; count++ }
			}
		}
		if count > 0 {
			cards[len(cards)-1].NumericAvg = sum / float64(count)
		}
		var snums []float64
		for _, s := range e.Scores {
			switch v := s.(type) {
			case float64: snums = append(snums, v)
			case int: snums = append(snums, float64(v))
			case int32: snums = append(snums, float64(v))
			case int64: snums = append(snums, float64(v))
			case string:
				if n, err := strconv.ParseFloat(v, 64); err == nil { snums = append(snums, n) }
			default: snums = append(snums, 0)
			}
		}
		cards[len(cards)-1].ScoreNums = snums
	}
	gs, _ := db.GetGlobalSetting()
	orgName := "PKSE UGM"
	if gs != nil && gs.OrgName != "" { orgName = gs.OrgName }
	var aspectLabels []string
	if len(entries) > 0 {
		inst2, _ := db.GetRaporInstanceByID(entries[0].InstanceID.Hex())
		if inst2 != nil {
			for _, sa := range inst2.ScoreAspects {
				if sa.Kind != "descriptive" {
					aspectLabels = append(aspectLabels, sa.Aspect)
				}
			}
		}
	}
	data := map[string]any{
		"OrgName":       orgName,
		"Member":        member,
		"MemberID":      member.ID.Hex(),
		"Entries":       cards,
		"AspectLabels":  aspectLabels,
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
		Kind   string
		Min    int
		Max    int
		TextVal string
	}
	var aspectList []struct{ Index int; Label string; Desc string; Kind string; Min int; Max int }
	if len(instance.ScoreAspects) > 0 {
		for i, sa := range instance.ScoreAspects {
			aspectList = append(aspectList, struct{ Index int; Label string; Desc string; Kind string; Min int; Max int }{i, sa.Aspect, sa.Desc, sa.Kind, sa.Min, sa.Max})
		}
	} else {
		aspectList = []struct{ Index int; Label string; Desc string; Kind string; Min int; Max int }{
			{0, "Kedisiplinan & Komitmen", "Kehadiran dan keteraturan mengikuti kegiatan", "numeric", 0, 5},
			{1, "Keaktifan", "Partisipasi aktif dalam kegiatan organisasi", "numeric", 0, 5},
			{2, "Tanggung Jawab", "Pemenuhan tugas dan kewajiban", "numeric", 0, 5},
			{3, "Kerjasama", "Kemampuan bekerja dalam tim", "numeric", 0, 5},
			{4, "Inisiatif", "Proaktif dalam kontribusi dan ide", "descriptive", 0, 5},
		}
	}
	var scoreNumeric []scoreItem
	var scoreDescriptive []scoreItem
	textVal := ""
	for _, sa := range aspectList {
		s := 0
		if sa.Index < len(entry.Scores) { switch v := entry.Scores[sa.Index].(type) {
case float64: s = int(v)
case int: s = v
case string:
    if n, err := strconv.Atoi(v); err == nil { s = n } else { s = 0; textVal = v }
default: s = 0
} }
		item := scoreItem{Aspect: sa.Label, Desc: sa.Desc, Score: s, Kind: sa.Kind, Min: sa.Min, Max: sa.Max, TextVal: textVal}
		if sa.Kind == "descriptive" {
			scoreDescriptive = append(scoreDescriptive, item)
		} else {
			scoreNumeric = append(scoreNumeric, item)
		}
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
		"MemberID":           member.ID.Hex(),
		"Instance":            instance,
		"Entry":               entry,
		"AllInstances":        allInstances,
	"ScoreNumeric":       scoreNumeric,
		"ScoreDescriptive":   scoreDescriptive,
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
