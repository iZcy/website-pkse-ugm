package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strconv"
	"strings"
	"time"

	"webapp/internal/auth"
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
		if inst != nil {
			for i, sa := range inst.ScoreAspects {
				if sa.Kind == "descriptive" { continue }
				if i < len(e.Scores) {
					switch v := e.Scores[i].(type) {
					case float64: snums = append(snums, v)
					case int: snums = append(snums, float64(v))
					case int32: snums = append(snums, float64(v))
					case int64: snums = append(snums, float64(v))
					case string:
						if n, err := strconv.ParseFloat(v, 64); err == nil { snums = append(snums, n) }
					default: snums = append(snums, 0)
					}
				} else {
					snums = append(snums, 0)
				}
			}
		}
		cards[len(cards)-1].ScoreNums = snums
	}
	gs, _ := db.GetGlobalSetting()
	orgName := "PKSE UGM"
	if gs != nil && gs.OrgName != "" { orgName = gs.OrgName }
	var aspectLabels []string
	if len(cards) > 0 {
		for _, e2 := range entries {
			if !e2.Published { continue }
			inst2, _ := db.GetRaporInstanceByID(e2.InstanceID.Hex())
			if inst2 != nil {
				for _, sa := range inst2.ScoreAspects {
					if sa.Kind != "descriptive" {
						aspectLabels = append(aspectLabels, sa.Aspect)
					}
				}
			}
			break
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

	// Get member's sub-period join date for exclusion
	memberJoinDate := member.CreatedAt // fallback
	if sp, ok := member.ActivePeriods[entry.PeriodLabel]; ok && sp != "" {
		periods, _ := db.GetPeriods()
		for _, p := range periods {
			if p.Label == entry.PeriodLabel {
				if p.SubPeriodDates != nil {
					if ds, ok2 := p.SubPeriodDates[sp]; ok2 && ds != "" {
						if t, err := time.Parse("2006-01-02", ds); err == nil {
							memberJoinDate = t
						}
					}
				}
				break
			}
		}
	}

	// Default dimension weights
	defWajib := map[string]float64{"hadir": 2, "izin": 1, "absen": 0}
	defOpt := map[string]float64{"hadir": 1.5, "izin": 0.75, "absen": 0}
	defVol := 1.0
	if instance.AttendanceWeights != nil {
		if w, ok := instance.AttendanceWeights["wajib"].(map[string]interface{}); ok {
			for k, v := range w { if f, ok2 := v.(float64); ok2 { defWajib[k] = f } }
		}
		if w, ok := instance.AttendanceWeights["tidak_wajib"].(map[string]interface{}); ok {
			for k, v := range w { if f, ok2 := v.(float64); ok2 { defOpt[k] = f } }
		}
		if v, ok := instance.AttendanceWeights["voluntary"].(float64); ok { defVol = v }
	}

	type actItem struct {
		Name     string
		Attended bool
		Status   string
	}
	catActs := map[string][]actItem{}
	var attTotal int
	hadirCount, izinCount, absenCount := 0, 0, 0
	for _, a := range activities {
		if a.Date.Before(memberJoinDate) { continue }
		status := "absen"
		if a.Attendance != nil {
			if sc, ok := a.Attendance[entry.MemberID.Hex()]; ok {
				switch sc {
				case 2: status = "hadir"
				case 1: status = "izin"
				case 0: status = "absen"
				}
			}
		}
		// Fallback: check attendee_ids for backward compat
		if status == "absen" && a.AttendeeIDs != nil {
			for _, aid := range a.AttendeeIDs {
				if aid == entry.MemberID { status = "hadir"; break }
			}
		}
		attended := status == "hadir"
		cat := a.Category
		if cat == "" { cat = "Lainnya" }
		catActs[cat] = append(catActs[cat], actItem{Name: a.Name, Attended: attended, Status: status})
		attTotal++
		switch status {
		case "hadir": hadirCount++
		case "izin": izinCount++
		case "absen": absenCount++
		}
	}
	absentCount := attTotal - hadirCount
	pct := 0
	if attTotal > 0 { pct = hadirCount * 100 / attTotal }

	// Volunteer/Lintas tracking
	type volItem struct {
		Name string
		Role string
	}
	var volActivities []volItem
	volCount := 0
	for _, a := range activities {
		if a.VolunteerIDs != nil {
			for _, vid := range a.VolunteerIDs {
				if vid == entry.MemberID {
					role := ""
					if a.VolunteerRoles != nil {
						role = a.VolunteerRoles[entry.MemberID.Hex()]
					}
					volActivities = append(volActivities, volItem{Name: a.Name, Role: role})
					volCount++
				}
			}
		}
	}

	// Calculate score using dimension weights from instance
	wajibScore, wajibMax := 0.0, 0.0
	optScore, optMax := 0.0, 0.0
	volBonus := 0.0
	for _, a := range activities {
		if a.Date.Before(memberJoinDate) { continue }
		status := "absen"
		if a.Attendance != nil {
			if sc, ok := a.Attendance[entry.MemberID.Hex()]; ok {
				switch sc { case 2: status = "hadir"; case 1: status = "izin"; case 0: status = "absen" }
			}
		}
		if status == "absen" && a.AttendeeIDs != nil {
			for _, aid := range a.AttendeeIDs { if aid == entry.MemberID { status = "hadir"; break } }
		}
		if a.Mandatory {
			wajibMax += defWajib["hadir"]
			wajibScore += defWajib[status]
		} else {
			optMax += defOpt["hadir"]
			optScore += defOpt[status]
		}
	}
	volBonus = defVol * float64(volCount)
	weightedTotal := wajibScore + optScore + volBonus
	weightedMax := wajibMax + optMax
	weightedPct := 0.0
	if weightedMax > 0 { weightedPct = weightedTotal / weightedMax * 100 }
	if weightedPct > 100 { weightedPct = 100 }
	var scoreTotal int
	for _, si := range scoreNumeric { scoreTotal += si.Score }
	var maxTotal int
	for _, si := range scoreNumeric { if si.Max > maxTotal { maxTotal = si.Max } }
	data := map[string]any{
		"OrgName":             orgName,
		"Member":              member,
		"MemberID":           member.ID.Hex(),
		"Instance":            instance,
		"Entry":               entry,
		"AllInstances":        allInstances,
	"ScoreNumeric":       scoreNumeric,
	"TotalScore":        scoreTotal,
	"MaxTotal":         maxTotal,
		"ScoreDescriptive":   scoreDescriptive,
		"AttendanceSummary":   map[string]any{
			"Present": hadirCount, "Izin": izinCount, "Absent": absentCount, "Volunteer": volCount,
			"Total": attTotal, "Percentage": pct,
			"Score": fmt.Sprintf("%.1f", weightedPct),
			"WajibScore": fmt.Sprintf("%.1f", wajibScore), "WajibMax": fmt.Sprintf("%.1f", wajibMax),
			"OptScore": fmt.Sprintf("%.1f", optScore), "OptMax": fmt.Sprintf("%.1f", optMax),
			"VolBonus": fmt.Sprintf("%.1f", volBonus),
		},
		"ActivitiesByCategory": catActs,
		"VolunteerActivities":  volActivities,
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor.html", data)
}


func (rh *RaporHandler) SearchMembers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if len(q) < 2 {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}
	members, err := db.SearchMembersByName(q)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte("[]"))
		return
	}
	type result struct {
		FullName string `json:"full_name"`
		NIM      string `json:"nim"`
	}
	var results []result
	for _, m := range members {
		results = append(results, result{FullName: m.FullName, NIM: m.NIM})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
func (rh *RaporHandler) renderError(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	rh.tmpl.ExecuteTemplate(w, "rapor.html", map[string]any{"Error": msg})
}

func (rh *RaporHandler) APILogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"error":"method not allowed"}`))
		return
	}
	var body struct {
		FullName string `json:"full_name"`
		NIM      string `json:"nim"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	if body.FullName == "" || body.NIM == "" {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"error":"Nama dan NIM wajib diisi"}`))
		return
	}
	member, err := db.FindMemberByNIM(body.NIM, body.FullName)
	if err != nil || member == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"error":"Data tidak ditemukan"}`))
		return
	}
	token := generateRaporToken(member.ID.Hex())
	http.SetCookie(w, &http.Cookie{Name: "rapor_auth", Value: token, Path: "/rapor", HttpOnly: true, SameSite: http.SameSiteStrictMode})
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"id":"` + member.ID.Hex() + `"}`))
}

func (rh *RaporHandler) APIMember(w http.ResponseWriter, r *http.Request) {
	memberID := strings.TrimPrefix(r.URL.Path, "/rapor/api/member/")
	cookie, err := r.Cookie("rapor_auth")
	authorized := err == nil && verifyRaporToken(cookie.Value, memberID)
	if !authorized {
		uname, _, ok := auth.GetSessionUser(r)
		if ok {
			m, e := db.GetMemberByNIM(uname)
			if e == nil && m.ID.Hex() == memberID {
				authorized = true
			}
		}
	}
	if !authorized {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"error":"unauthorized"}`))
		return
	}
	member, err := db.GetMemberByID(memberID)
	if err != nil { w.Header().Set("Content-Type", "application/json"); w.Write([]byte(`{}`)); return }
	entries, _ := db.GetRaporEntriesForMember(memberID, "")
	type entryCard struct {
		InstanceTitle string        `json:"instance_title"`
		PeriodLabel   string        `json:"period_label"`
		Token         string        `json:"token"`
		Scores        []interface{} `json:"scores"`
		ActivityStart string        `json:"activity_start"`
		ActivityEnd   string        `json:"activity_end"`
	}
	var cards []entryCard
	var labels []string
	var allScores [][]float64
	var chartLabels []string
	for _, e := range entries {
		if !e.Published { continue }
		inst, _ := db.GetRaporInstanceByID(e.InstanceID.Hex())
		title := "Rapor"
		astart, aend := "", ""
		if inst != nil {
			title = inst.Title
			astart = inst.ActivityStart.Format("02 Jan 2006")
			aend = inst.ActivityEnd.Format("02 Jan 2006")
			if len(chartLabels) == 0 {
				for _, sa := range inst.ScoreAspects {
					if sa.Kind != "descriptive" { chartLabels = append(chartLabels, sa.Aspect) }
				}
			}
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
		allScores = append(allScores, snums)
		labels = append(labels, title)
		cards = append(cards, entryCard{InstanceTitle: title, PeriodLabel: e.PeriodLabel, Token: e.Token, Scores: e.Scores, ActivityStart: astart, ActivityEnd: aend})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"member": map[string]any{"FullName": member.FullName, "Department": member.Department, "ProgramStudi": member.ProgramStudi, "NIM": member.NIM, "PhotoURL": member.PhotoURL},
		"entries": cards, "chartData": map[string]any{"labels": labels, "scores": allScores}, "aspectLabels": chartLabels,
	})
}

func (rh *RaporHandler) APIEntry(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.URL.Path, "/rapor/api/entry/")
	entry, err := db.GetRaporEntryByToken(token)
	if err != nil || !entry.Published { w.Header().Set("Content-Type", "application/json"); w.Write([]byte("{}")); return }
	inst, _ := db.GetRaporInstanceByID(entry.InstanceID.Hex())
	member, _ := db.GetMemberByID(entry.MemberID.Hex())
	
	type scoreItem struct {
		Label   string `json:"label"`
		Desc    string `json:"desc"`
		Score   int    `json:"score"`
		Kind    string `json:"kind"`
		Min     int    `json:"min"`
		Max     int    `json:"max"`
		TextVal string `json:"textVal,omitempty"`
	}
	var scores []scoreItem
	if inst != nil {
		for i, sa := range inst.ScoreAspects {
			s := 0; tv := ""
			if i < len(entry.Scores) {
				switch v := entry.Scores[i].(type) {
				case float64: s = int(v)
				case int: s = v
				case string:
					if n, err := strconv.Atoi(v); err == nil { s = n } else { tv = v }
				}
			}
			scores = append(scores, scoreItem{Label: sa.Aspect, Desc: sa.Desc, Score: s, Kind: sa.Kind, Min: sa.Min, Max: sa.Max, TextVal: tv})
		}
	}
	
	activities, _ := db.GetActivitiesByDateRange(entry.PeriodLabel, "", inst.ActivityStart, inst.ActivityEnd)

	memberJoinDate := member.CreatedAt
	if sp, ok := member.ActivePeriods[entry.PeriodLabel]; ok && sp != "" {
		periods, _ := db.GetPeriods()
		for _, p := range periods {
			if p.Label == entry.PeriodLabel && p.SubPeriodDates != nil {
				if ds, ok2 := p.SubPeriodDates[sp]; ok2 && ds != "" {
					if t, err := time.Parse("2006-01-02", ds); err == nil { memberJoinDate = t }
				}
				break
			}
		}
	}

	defWajib := map[string]float64{"hadir": 2, "izin": 1, "absen": 0}
	defOpt := map[string]float64{"hadir": 1.5, "izin": 0.75, "absen": 0}
	defVol := 1.0
	if inst != nil && inst.AttendanceWeights != nil {
		if w, ok := inst.AttendanceWeights["wajib"].(map[string]interface{}); ok {
			for k, v := range w { if f, ok2 := v.(float64); ok2 { defWajib[k] = f } }
		}
		if w, ok := inst.AttendanceWeights["tidak_wajib"].(map[string]interface{}); ok {
			for k, v := range w { if f, ok2 := v.(float64); ok2 { defOpt[k] = f } }
		}
		if v, ok := inst.AttendanceWeights["voluntary"].(float64); ok { defVol = v }
	}

	type actItem struct {
		Name     string `json:"name"`
		Attended bool   `json:"attended"`
		Status   string `json:"status"`
	}
	type volItem struct {
		Name string `json:"name"`
		Role string `json:"role"`
	}
	catActs := map[string][]actItem{}
	hadirCount, izinCount, absenCount, attTotal := 0, 0, 0, 0
	wajibScore, wajibMax := 0.0, 0.0
	optScore, optMax := 0.0, 0.0
	var volActivities []volItem
	volCount := 0

	for _, a := range activities {
		if a.Date.Before(memberJoinDate) { continue }
		status := "absen"
		if a.Attendance != nil {
			if sc, ok := a.Attendance[entry.MemberID.Hex()]; ok {
				switch sc { case 2: status = "hadir"; case 1: status = "izin" }
			}
		}
		if status == "absen" {
			for _, aid := range a.AttendeeIDs { if aid == entry.MemberID { status = "hadir"; break } }
		}
		catActs[a.Category] = append(catActs[a.Category], actItem{Name: a.Name, Attended: status == "hadir", Status: status})
		attTotal++
		switch status {
		case "hadir": hadirCount++
		case "izin": izinCount++
		default: absenCount++
		}
		if a.Mandatory { wajibMax += defWajib["hadir"]; wajibScore += defWajib[status] } else { optMax += defOpt["hadir"]; optScore += defOpt[status] }
		if a.VolunteerIDs != nil {
			for _, vid := range a.VolunteerIDs {
				if vid == entry.MemberID {
					role := ""
					if a.VolunteerRoles != nil { role = a.VolunteerRoles[entry.MemberID.Hex()] }
					volActivities = append(volActivities, volItem{Name: a.Name, Role: role})
					volCount++
				}
			}
		}
	}
	volBonus := defVol * float64(volCount)
	weightedTotal := wajibScore + optScore + volBonus
	weightedMax := wajibMax + optMax
	weightedPct := 0.0
	if weightedMax > 0 { weightedPct = weightedTotal / weightedMax * 100 }
	if weightedPct > 100 { weightedPct = 100 }
	pct := 0
	if attTotal > 0 { pct = hadirCount * 100 / attTotal }

	allEntries, _ := db.GetRaporEntriesForMember(entry.MemberID.Hex(), entry.PeriodLabel)
	var allInstances []map[string]any
	for _, e := range allEntries {
		if !e.Published { continue }
		inst2, _ := db.GetRaporInstanceByID(e.InstanceID.Hex())
		allInstances = append(allInstances, map[string]any{
			"title": inst2.Title, "token": e.Token, "active": e.Token == token,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"member": map[string]any{"id": member.ID.Hex(), "FullName": member.FullName, "Department": member.Department, "ProgramStudi": member.ProgramStudi, "NIM": member.NIM, "PhotoURL": member.PhotoURL, "Angkatan": member.Angkatan, "Fakultas": member.Fakultas},
		"instance": map[string]any{"title": inst.Title, "period_label": inst.PeriodLabel},
		"entry": entry,
		"scores": scores,
		"attendance": map[string]any{
			"present": hadirCount, "izin": izinCount, "absent": absenCount, "volunteer": volCount,
			"total": attTotal, "pct": pct, "score": weightedPct,
			"wajib": map[string]float64{"score": wajibScore, "max": wajibMax},
			"opt": map[string]float64{"score": optScore, "max": optMax},
			"volBonus": volBonus,
		},
		"activities": catActs,
		"volunteerActivities": volActivities,
		"allInstances": allInstances,
	})
}
