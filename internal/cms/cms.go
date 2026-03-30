package cms

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"webapp/internal/auth"
	"webapp/internal/db"
)

// ── helpers ──────────────────────────────────────────────────────────────────

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func readJSON(r *http.Request, v any) error {
	return json.NewDecoder(r.Body).Decode(v)
}

func requireAny(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	u, role, ok := auth.GetSessionUser(r)
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "unauthorized"})
	}
	return u, role, ok
}

func requireSuperAdmin(w http.ResponseWriter, r *http.Request) bool {
	_, role, ok := auth.GetSessionUser(r)
	if !ok || role != "superadmin" {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return false
	}
	return true
}

// periodForRequest returns which period the current user is allowed to use.
// Superadmin: reads from ?period= query param or body field (caller must pass it).
// Admin: forced to their assigned period regardless of query param.
func periodForUser(r *http.Request, username, role string) string {
	if role == "superadmin" {
		return r.URL.Query().Get("period")
	}
	// admin — look up their assigned period
	u, err := db.GetUserByUsername(username)
	if err != nil {
		return ""
	}
	return u.AssignedPeriod
}

// ── GlobalSetting ────────────────────────────────────────────────────────────

func GlobalSettingHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		u, role, ok := requireAny(w, r)
		_ = u
		_ = role
		if !ok {
			return
		}
		g, err := db.GetGlobalSetting()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, g)
	case http.MethodPut:
		if !requireSuperAdmin(w, r) {
			return
		}
		var g db.GlobalSetting
		if err := readJSON(r, &g); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpsertGlobalSetting(g); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── PeriodAbout ──────────────────────────────────────────────────────────────

func PeriodAboutHandler(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		periodLabel := periodForUser(r, username, role)
		if periodLabel == "" {
			writeJSON(w, 400, map[string]string{"error": "period required"})
			return
		}
		pa, err := db.GetPeriodAbout(periodLabel)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, pa)
	case http.MethodPut:
		var pa db.PeriodAbout
		if err := readJSON(r, &pa); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		// Admin can only update their own period
		if role != "superadmin" {
			u, err := db.GetUserByUsername(username)
			if err != nil || u.AssignedPeriod == "" || u.AssignedPeriod != pa.PeriodLabel {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
		}
		if err := db.UpsertPeriodAbout(pa); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Departments ──────────────────────────────────────────────────────────────

func Departments(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/departments")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		period := periodForUser(r, username, role)
		depts, err := db.GetDepartments(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, depts)

	case http.MethodPost:
		var d db.Department
		if err := readJSON(r, &d); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if role != "superadmin" {
			u, _ := db.GetUserByUsername(username)
			d.PeriodLabel = u.AssignedPeriod
		}
		if err := db.CreateDepartment(d); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var fields map[string]any
		if err := readJSON(r, &fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateDepartment(idSegment, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteDepartment(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Members ──────────────────────────────────────────────────────────────────

func Members(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/members")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		period := periodForUser(r, username, role)
		if period == "" {
			period = r.URL.Query().Get("period")
		}
		members, err := db.GetMembers(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, members)

	case http.MethodPost:
		var m db.Member
		if err := readJSON(r, &m); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if role != "superadmin" {
			u, _ := db.GetUserByUsername(username)
			m.PeriodLabel = u.AssignedPeriod
			m.ActivePeriods = nil
			m.ActivePositions = nil
		}
		if err := db.CreateMember(m); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var fields map[string]any
		if err := readJSON(r, &fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if role != "superadmin" {
			u, err := db.GetUserByUsername(username)
			if err != nil || u.AssignedPeriod == "" {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			delete(fields, "active_periods")
			delete(fields, "active_positions")
			if _, hasDept := fields["department"]; hasDept {
				m, err := db.GetMemberByID(idSegment)
				if err != nil {
					writeJSON(w, 404, map[string]string{"error": "member not found"})
					return
				}
				sp := ""
				if m.ActivePeriods != nil {
					sp = strings.TrimSpace(m.ActivePeriods[u.AssignedPeriod])
				}
				if sp == "" {
					writeJSON(w, 403, map[string]string{"error": "anggota belum aktif di periode admin"})
					return
				}
			}
		}
		if err := db.UpdateMember(idSegment, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteMember(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Announcements ────────────────────────────────────────────────────────────

func Announcements(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/announcements")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		period := periodForUser(r, username, role)
		items, err := db.GetAnnouncements(0, false, period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)

	case http.MethodPost:
		var a db.Announcement
		if err := readJSON(r, &a); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if role != "superadmin" {
			u, _ := db.GetUserByUsername(username)
			a.PeriodLabel = u.AssignedPeriod
		}
		if err := db.CreateAnnouncement(a); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var fields map[string]any
		if err := readJSON(r, &fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateAnnouncement(idSegment, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteAnnouncement(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Articles ─────────────────────────────────────────────────────────────────

func Articles(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/articles")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		period := periodForUser(r, username, role)
		articles, err := db.GetArticles(false, period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, articles)

	case http.MethodPost:
		var a db.Article
		if err := readJSON(r, &a); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if role != "superadmin" {
			u, _ := db.GetUserByUsername(username)
			a.PeriodLabel = u.AssignedPeriod
		}
		if err := db.CreateArticle(a); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var fields map[string]any
		if err := readJSON(r, &fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateArticle(idSegment, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteArticle(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Periods ──────────────────────────────────────────────────────────────────

func Periods(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	seg := strings.TrimPrefix(r.URL.Path, "/api/cms/periods")
	seg = strings.Trim(seg, "/")

	switch r.Method {
	case http.MethodGet:
		periods, err := db.GetPeriods()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, periods)

	case http.MethodPost:
		if !requireSuperAdmin(w, r) {
			return
		}
		var p db.Period
		if err := readJSON(r, &p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if len(p.SubPeriods) == 0 {
			p.SubPeriods = []string{"Gelombang 1"}
		}
		if err := db.CreatePeriod(p); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if !requireSuperAdmin(w, r) {
			return
		}
		// PUT /api/cms/periods/<label>/activate  OR  PUT /api/cms/periods/<label>
		parts := strings.SplitN(seg, "/", 2)
		label := parts[0]
		action := ""
		if len(parts) == 2 {
			action = parts[1]
		}
		if action == "activate" {
			if err := db.SetActivePeriod(label); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]string{"status": "activated"})
			return
		}
		var fields map[string]any
		if err := readJSON(r, &fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if spRaw, ok := fields["sub_periods"]; ok {
			var next []string
			switch v := spRaw.(type) {
			case []any:
				for _, item := range v {
					s, _ := item.(string)
					s = strings.TrimSpace(s)
					if s != "" {
						next = append(next, s)
					}
				}
			case []string:
				for _, s := range v {
					s = strings.TrimSpace(s)
					if s != "" {
						next = append(next, s)
					}
				}
			}
			if len(next) == 0 {
				next = []string{"Gelombang 1"}
			}
			cur, err := db.GetPeriodByLabel(label)
			if err == nil && cur != nil {
				keep := map[string]bool{}
				for _, s := range next {
					keep[s] = true
				}
				for _, old := range cur.SubPeriods {
					if keep[old] {
						continue
					}
					cnt, err := db.CountMembersActiveFromSubPeriod(label, old)
					if err != nil {
						writeJSON(w, 500, map[string]string{"error": err.Error()})
						return
					}
					if cnt > 0 {
						writeJSON(w, 400, map[string]string{"error": "sub-periode dengan anggota aktif tidak dapat dihapus"})
						return
					}
				}
			}
			fields["sub_periods"] = next
		}
		if err := db.UpdatePeriod(label, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if !requireSuperAdmin(w, r) {
			return
		}
		label := strings.Trim(seg, "/")
		if label == "" {
			writeJSON(w, 400, map[string]string{"error": "period label required"})
			return
		}
		if label == "GLOBAL" {
			writeJSON(w, 400, map[string]string{"error": "cannot delete default period"})
			return
		}
		hasData, err := db.PeriodHasData(label)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		if hasData {
			writeJSON(w, 400, map[string]string{"error": "periode ini memiliki data (anggota, pengumuman, dll) dan tidak dapat dihapus"})
			return
		}
		if err := db.DeletePeriod(label); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Accounts ─────────────────────────────────────────────────────────────────

func Accounts(w http.ResponseWriter, r *http.Request) {
	if !requireSuperAdmin(w, r) {
		return
	}
	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/accounts")
	idSegment = strings.Trim(idSegment, "/")

	switch r.Method {
	case http.MethodGet:
		users, err := db.GetUsers()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		// strip password hash before returning
		type safeUser struct {
			ID             string `json:"id"`
			Username       string `json:"username"`
			Role           string `json:"role"`
			AssignedPeriod string `json:"assigned_period"`
		}
		safe := make([]safeUser, len(users))
		for i, u := range users {
			safe[i] = safeUser{ID: u.ID, Username: u.Username, Role: u.Role, AssignedPeriod: u.AssignedPeriod}
		}
		writeJSON(w, 200, safe)

	case http.MethodPost:
		var payload struct {
			Username       string `json:"username"`
			Password       string `json:"password"`
			Role           string `json:"role"`
			AssignedPeriod string `json:"assigned_period"`
		}
		if err := readJSON(r, &payload); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		hash, err := auth.HashPassword(payload.Password)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		u := db.User{
			ID:             payload.Username,
			Username:       payload.Username,
			PasswordHash:   hash,
			Role:           payload.Role,
			AssignedPeriod: payload.AssignedPeriod,
		}
		if err := db.CreateUser(u); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var payload map[string]any
		if err := readJSON(r, &payload); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		// hash password if provided
		if pw, ok := payload["password"].(string); ok && pw != "" {
			hash, err := auth.HashPassword(pw)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			payload["password_hash"] = hash
		}
		delete(payload, "password")
		if err := db.UpdateUser(idSegment, payload); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteUser(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Upload ────────────────────────────────────────────────────────────────────

func Upload(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	r.ParseMultipartForm(5 << 20) // 5 MB
	file, header, err := r.FormFile("file")
	if err != nil {
		file, header, err = r.FormFile("files[0]")
	}
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": "file required"})
		return
	}
	defer file.Close()

	ext := filepath.Ext(header.Filename)
	base := strings.TrimSuffix(filepath.Base(header.Filename), ext)
	safeName := fmt.Sprintf("%d_%s%s", time.Now().UnixMilli(), sanitizeUploadName(base), ext)

	data, err := io.ReadAll(file)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "cannot read file"})
		return
	}
	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err = db.SaveFileToGridFS(safeName, data, contentType)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": "upload failed: " + err.Error()})
		return
	}

	writeJSON(w, 200, map[string]string{"url": "/uploads/" + safeName})
}

func ServeUpload(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/uploads/")
	filename = strings.Trim(filename, "/ ")
	if filename == "" {
		http.NotFound(w, r)
		return
	}
	data, contentType, err := db.GetFileFromGridFS(filename)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "public, max-age=31536000")
	w.Write(data)
}

func sanitizeUploadName(s string) string {
	var b strings.Builder
	for _, c := range s {
		if (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-' || c == '_' {
			b.WriteRune(c)
		} else {
			b.WriteRune('_')
		}
	}
	r := b.String()
	if len(r) > 60 {
		r = r[:60]
	}
	if r == "" {
		r = "upload"
	}
	return r
}

// ── Batch Updates ────────────────────────────────────────────────────────────

func BatchUpdateMembers(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPut {
		writeJSON(w, 405, map[string]string{"error": "Method not allowed"})
		return
	}
	var req []map[string]any
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	for _, m := range req {
		id, ok := m["id"].(string)
		if !ok {
			continue
		}
		delete(m, "id")
		db.UpdateMember(id, m)
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func BatchUpdateDepartments(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	if r.Method != http.MethodPut {
		writeJSON(w, 405, map[string]string{"error": "Method not allowed"})
		return
	}
	var req []map[string]any
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	for _, d := range req {
		id, ok := d["id"].(string)
		if !ok {
			continue
		}
		delete(d, "id")
		db.UpdateDepartment(id, d)
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

// --- PROGRAMS ---
func Programs(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}

	idSegment := strings.TrimPrefix(r.URL.Path, "/api/cms/programs")
	idSegment = strings.Trim(idSegment, "/")

	resolvePeriod := func(payloadPeriod string) string {
		if role == "superadmin" {
			payloadPeriod = strings.TrimSpace(payloadPeriod)
			if payloadPeriod != "" {
				return payloadPeriod
			}
			return strings.TrimSpace(r.URL.Query().Get("period"))
		}
		u, err := db.GetUserByUsername(username)
		if err != nil {
			return ""
		}
		return strings.TrimSpace(u.AssignedPeriod)
	}

	validateDepartment := func(periodLabel, dept string) error {
		dept = strings.TrimSpace(dept)
		if dept == "" {
			return fmt.Errorf("kementerian wajib dipilih")
		}
		depts, err := db.GetDepartments(periodLabel)
		if err != nil {
			return err
		}
		for _, d := range depts {
			if strings.EqualFold(strings.TrimSpace(d.Name), dept) {
				return nil
			}
		}
		return fmt.Errorf("kementerian tidak valid untuk periode ini")
	}

	switch r.Method {
	case http.MethodGet:
		periodLabel := resolvePeriod("")
		items, err := db.GetPrograms(periodLabel)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)

	case http.MethodPost:
		var p db.Program
		if err := readJSON(r, &p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		p.PeriodLabel = resolvePeriod(p.PeriodLabel)
		if p.PeriodLabel == "" {
			writeJSON(w, 400, map[string]string{"error": "period required"})
			return
		}
		if strings.TrimSpace(p.Title) == "" {
			writeJSON(w, 400, map[string]string{"error": "judul program wajib diisi"})
			return
		}
		if err := validateDepartment(p.PeriodLabel, p.Department); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		p.Department = strings.TrimSpace(p.Department)
		if err := db.InsertProgram(&p); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, p)

	case http.MethodPut:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		var p db.Program
		if err := readJSON(r, &p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		p.PeriodLabel = resolvePeriod(p.PeriodLabel)
		if p.PeriodLabel == "" {
			writeJSON(w, 400, map[string]string{"error": "period required"})
			return
		}
		if strings.TrimSpace(p.Title) == "" {
			writeJSON(w, 400, map[string]string{"error": "judul program wajib diisi"})
			return
		}
		if err := validateDepartment(p.PeriodLabel, p.Department); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		p.Department = strings.TrimSpace(p.Department)
		if err := db.UpdateProgram(idSegment, &p); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})

	case http.MethodDelete:
		if idSegment == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteProgram(idSegment); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// --- FAQS ---
func FAQs(w http.ResponseWriter, r *http.Request) {
	faqIDFromRequest := func() string {
		id := strings.TrimPrefix(r.URL.Path, "/api/cms/faqs")
		id = strings.Trim(id, "/")
		if id != "" {
			return id
		}
		return strings.TrimSpace(r.URL.Query().Get("id"))
	}
	periodFromRequest := func() string {
		pl := strings.TrimSpace(r.URL.Query().Get("period"))
		if pl == "" {
			pl = strings.TrimSpace(r.URL.Query().Get("p"))
		}
		return pl
	}

	switch r.Method {
	case http.MethodGet:
		pl := periodFromRequest()
		items, err := db.GetFAQs(pl)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(items)
	case http.MethodPost:
		var f db.FAQ
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		if err := db.InsertFAQ(&f); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(f)
	case http.MethodPut:
		id := faqIDFromRequest()
		if id == "" {
			http.Error(w, "id required", 400)
			return
		}
		var f db.FAQ
		if err := json.NewDecoder(r.Body).Decode(&f); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		if err := db.UpdateFAQ(id, &f); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"success": true})
	case http.MethodDelete:
		id := faqIDFromRequest()
		if id == "" {
			http.Error(w, "id required", 400)
			return
		}
		if err := db.DeleteFAQ(id); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"success": true})
	default:
		http.Error(w, "Method not allowed", 405)
	}
}

func normalizeShortCode(raw string) string {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return ""
	}
	var b strings.Builder
	for _, c := range raw {
		if (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' {
			b.WriteRune(c)
		}
	}
	out := b.String()
	if len(out) > 32 {
		out = out[:32]
	}
	return out
}

func randomShortCode(n int) (string, error) {
	const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789"
	if n <= 0 {
		n = 6
	}
	buf := make([]byte, n)
	max := big.NewInt(int64(len(alphabet)))
	for i := 0; i < n; i++ {
		r, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		buf[i] = alphabet[r.Int64()]
	}
	return string(buf), nil
}

// --- SHORTLINKS ---
func ShortLinks(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	if role != "superadmin" {
		writeJSON(w, 403, map[string]string{"error": "forbidden"})
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/cms/shortlinks")
	id = strings.Trim(id, "/")

	switch r.Method {
	case http.MethodGet:
		items, err := db.GetShortLinks()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)

	case http.MethodPost:
		var payload struct {
			TargetURL string `json:"target_url"`
			Label     string `json:"label"`
			Code      string `json:"code"`
		}
		if err := readJSON(r, &payload); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		target := strings.TrimSpace(payload.TargetURL)
		u, err := url.ParseRequestURI(target)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
			writeJSON(w, 400, map[string]string{"error": "target_url must be valid http/https URL"})
			return
		}

		code := normalizeShortCode(payload.Code)
		if code == "" {
			for i := 0; i < 12; i++ {
				cand, err := randomShortCode(6)
				if err != nil {
					writeJSON(w, 500, map[string]string{"error": "cannot generate short code"})
					return
				}
				exists, err := db.ShortLinkCodeExists(cand)
				if err != nil {
					writeJSON(w, 500, map[string]string{"error": err.Error()})
					return
				}
				if !exists {
					code = cand
					break
				}
			}
			if code == "" {
				writeJSON(w, 500, map[string]string{"error": "failed to reserve short code"})
				return
			}
		} else {
			exists, err := db.ShortLinkCodeExists(code)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			if exists {
				writeJSON(w, 409, map[string]string{"error": "short code already used"})
				return
			}
		}

		item := db.ShortLink{
			Code:      code,
			TargetURL: target,
			Label:     strings.TrimSpace(payload.Label),
			CreatedBy: username,
		}
		if err := db.InsertShortLink(&item); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, item)

	case http.MethodDelete:
		if id == "" {
			if r.URL.Query().Get("all") != "1" {
				writeJSON(w, 400, map[string]string{"error": "id required"})
				return
			}
			if err := db.DeleteAllShortLinks(); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"success": true})
			return
		}
		if err := db.DeleteShortLink(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// --- STATS ---
func SyncStatsTemplate(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	var req struct {
		PeriodLabel string `json:"period_label"`
	}
	if err := readJSON(r, &req); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	periodLabel := req.PeriodLabel
	if role != "superadmin" {
		u, err := db.GetUserByUsername(username)
		if err != nil {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		periodLabel = u.AssignedPeriod
	}
	if periodLabel == "" || periodLabel == "_TEMPLATE_" {
		writeJSON(w, 400, map[string]string{"error": "period_label invalid"})
		return
	}
	templates, err := db.GetStats("_TEMPLATE_")
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	for _, t := range templates {
		if !t.Fillable {
			continue
		}
		tid := t.ID.Hex()
		if t.TemplateID != "" {
			tid = t.TemplateID
		}
		if err := db.UpsertPeriodStatValue(periodLabel, tid, "0"); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
	}
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func Stats(w http.ResponseWriter, r *http.Request) {
	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		pl := r.URL.Query().Get("period")
		if role != "superadmin" {
			u, err := db.GetUserByUsername(username)
			if err != nil {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			pl = u.AssignedPeriod
		}
		if pl == "" {
			writeJSON(w, 400, map[string]string{"error": "period required"})
			return
		}
		if pl == "_TEMPLATE_" {
			items, err := db.GetStats("_TEMPLATE_")
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, items)
			return
		}
		templates, err := db.GetStats("_TEMPLATE_")
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		values, err := db.GetStats(pl)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		byTemplate := map[string]db.StatData{}
		for _, v := range values {
			if v.TemplateID != "" {
				byTemplate[v.TemplateID] = v
			}
		}
		out := make([]db.StatData, 0, len(templates))
		for _, t := range templates {
			tid := t.ID.Hex()
			if t.TemplateID != "" {
				tid = t.TemplateID
			}
			item := t
			item.PeriodLabel = pl
			item.TemplateID = tid
			if v, ok := byTemplate[tid]; ok {
				item.ID = v.ID
				item.Value = v.Value
			} else {
				item.ID = item.ID
				item.Value = ""
			}
			out = append(out, item)
		}
		writeJSON(w, 200, out)

	case http.MethodPost:
		var s db.StatData
		if err := readJSON(r, &s); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if s.PeriodLabel == "_TEMPLATE_" {
			if role != "superadmin" {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			if err := db.InsertStat(&s); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 201, s)
			return
		}
		if role != "superadmin" {
			u, err := db.GetUserByUsername(username)
			if err != nil {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			s.PeriodLabel = u.AssignedPeriod
		}
		if err := db.UpsertPeriodStatValue(s.PeriodLabel, s.TemplateID, s.Value); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})

	case http.MethodPut:
		id := strings.TrimPrefix(r.URL.Path, "/api/cms/stats/")
		var s db.StatData
		if err := readJSON(r, &s); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if s.PeriodLabel == "_TEMPLATE_" {
			if role != "superadmin" {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			if err := db.UpdateStat(id, &s); err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			writeJSON(w, 200, map[string]any{"success": true})
			return
		}
		if role != "superadmin" {
			u, err := db.GetUserByUsername(username)
			if err != nil {
				writeJSON(w, 403, map[string]string{"error": "forbidden"})
				return
			}
			s.PeriodLabel = u.AssignedPeriod
		}
		if err := db.UpsertPeriodStatValue(s.PeriodLabel, s.TemplateID, s.Value); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})

	case http.MethodDelete:
		id := strings.TrimPrefix(r.URL.Path, "/api/cms/stats/")
		if err := db.DeleteStat(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]any{"success": true})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
