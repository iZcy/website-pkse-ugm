package cms

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"webapp/internal/auth"
	"webapp/internal/db"
)

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
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

// ── Announcements ─────────────────────────────────────────────────────────────

func Announcements(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}
	period := r.URL.Query().Get("period")
	id := strings.TrimPrefix(r.URL.Path, "/api/cms/announcements")
	id = strings.TrimPrefix(id, "/")

	switch {
	case r.Method == "GET" && id == "":
		items, err := db.GetAnnouncements(0, false, period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)
	case r.Method == "POST" && id == "":
		var a db.Announcement
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.CreateAnnouncement(a); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	case r.Method == "PUT" && id != "":
		var fields map[string]any
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateAnnouncement(id, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	case r.Method == "DELETE" && id != "":
		if err := db.DeleteAnnouncement(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Departments ───────────────────────────────────────────────────────────────

func Departments(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}
	period := r.URL.Query().Get("period")
	id := strings.TrimPrefix(r.URL.Path, "/api/cms/departments")
	id = strings.TrimPrefix(id, "/")

	switch {
	case r.Method == "GET" && id == "":
		items, err := db.GetDepartments(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)
	case r.Method == "POST" && id == "":
		var d db.Department
		if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.CreateDepartment(d); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	case r.Method == "PUT" && id != "":
		var fields map[string]any
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateDepartment(id, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	case r.Method == "DELETE" && id != "":
		if err := db.DeleteDepartment(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Officers ──────────────────────────────────────────────────────────────────

func Officers(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}
	period := r.URL.Query().Get("period")
	id := strings.TrimPrefix(r.URL.Path, "/api/cms/officers")
	id = strings.TrimPrefix(id, "/")

	switch {
	case r.Method == "GET" && id == "":
		items, err := db.GetOfficers(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)
	case r.Method == "POST" && id == "":
		var o db.Officer
		if err := json.NewDecoder(r.Body).Decode(&o); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.CreateOfficer(o); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	case r.Method == "PUT" && id != "":
		var fields map[string]any
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpdateOfficer(id, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	case r.Method == "DELETE" && id != "":
		if err := db.DeleteOfficer(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Site Setting ──────────────────────────────────────────────────────────────

func SiteSetting(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}
	period := r.URL.Query().Get("period")

	switch r.Method {
	case "GET":
		s, err := db.GetSiteSetting(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, s)
	case "PUT":
		var fields map[string]any
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if err := db.UpsertSiteSetting(period, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Articles ──────────────────────────────────────────────────────────────────

func Articles(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}
	period := r.URL.Query().Get("period")
	id := strings.TrimPrefix(r.URL.Path, "/api/cms/articles")
	id = strings.TrimPrefix(id, "/")

	switch {
	case r.Method == "GET" && id == "":
		items, err := db.GetArticles(false, period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)
	case r.Method == "POST" && id == "":
		var a db.Article
		if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		now := time.Now()
		a.CreatedAt = now
		a.UpdatedAt = now
		if err := db.CreateArticle(a); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	case r.Method == "PUT" && id != "":
		var fields map[string]any
		if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		fields["updated_at"] = time.Now()
		if err := db.UpdateArticle(id, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	case r.Method == "DELETE" && id != "":
		if err := db.DeleteArticle(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Periods ───────────────────────────────────────────────────────────────────

func Periods(w http.ResponseWriter, r *http.Request) {
	if _, _, ok := requireAny(w, r); !ok {
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/cms/periods")
	path = strings.TrimPrefix(path, "/")

	// PUT /api/cms/periods/{label}/activate
	if strings.HasSuffix(path, "/activate") {
		if !requireSuperAdmin(w, r) {
			return
		}
		label := strings.TrimSuffix(path, "/activate")
		if err := db.SetActivePeriod(label); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "activated"})
		return
	}

	switch {
	case r.Method == "GET":
		items, err := db.GetPeriods()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, items)
	case r.Method == "POST":
		if !requireSuperAdmin(w, r) {
			return
		}
		var p db.Period
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		p.CreatedAt = time.Now()
		if err := db.CreatePeriod(p); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

// ── Accounts (superadmin only) ────────────────────────────────────────────────

func Accounts(w http.ResponseWriter, r *http.Request) {
	if !requireSuperAdmin(w, r) {
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/cms/accounts")
	id = strings.TrimPrefix(id, "/")

	type safeUser struct {
		ID        string    `json:"id"`
		Username  string    `json:"username"`
		Role      string    `json:"role"`
		CreatedAt time.Time `json:"created_at"`
	}

	switch {
	case r.Method == "GET" && id == "":
		users, err := db.GetUsers()
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		safe := make([]safeUser, 0, len(users))
		for _, u := range users {
			safe = append(safe, safeUser{ID: u.ID, Username: u.Username, Role: u.Role, CreatedAt: u.CreatedAt})
		}
		writeJSON(w, 200, safe)
	case r.Method == "POST" && id == "":
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		u := db.User{Username: req.Username, PasswordHash: hash, Role: req.Role, CreatedAt: time.Now()}
		if err := db.CreateUser(u); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 201, map[string]string{"status": "created"})
	case r.Method == "PUT" && id != "":
		var req struct {
			Username string `json:"username"`
			Password string `json:"password"`
			Role     string `json:"role"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		fields := map[string]any{"username": req.Username, "role": req.Role}
		if req.Password != "" {
			hash, err := auth.HashPassword(req.Password)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
			fields["password_hash"] = hash
		}
		if err := db.UpdateUser(id, fields); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "updated"})
	case r.Method == "DELETE" && id != "":
		if err := db.DeleteUser(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
