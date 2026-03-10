package cms

import (
	"encoding/json"
	"net/http"
	"strings"

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
		if err := db.UpdatePeriod(label, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

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
