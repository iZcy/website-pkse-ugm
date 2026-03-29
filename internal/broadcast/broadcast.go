package broadcast

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"regexp"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"webapp/internal/auth"
	"webapp/internal/db"
)

const waServiceURL = "http://wa-service:8081"

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

func proxyToWA(method, path string, body io.Reader) (*http.Response, error) {
	url := waServiceURL + path
	var reqBody io.Reader
	if body != nil {
		reqBody = body
	}
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return http.DefaultClient.Do(req)
}

// ── WebSocket hub ────────────────────────────────────────────────────────────

type hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
}

var wsHub = &hub{
	clients:    make(map[*websocket.Conn]bool),
	broadcast:  make(chan []byte, 100),
	register:   make(chan *websocket.Conn),
	unregister: make(chan *websocket.Conn),
}

func (h *hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
		}
	}
}

func init() {
	go wsHub.run()
}

func broadcastProgress(event map[string]any) {
	data, _ := json.Marshal(event)
	wsHub.broadcast <- data
}

// ── Handlers ─────────────────────────────────────────────────────────────────

func Status(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}

	resp, err := proxyToWA(http.MethodGet, "/status", nil)
	if err != nil {
		writeJSON(w, 502, map[string]any{"error": "wa-service unreachable", "connected": false})
		return
	}
	defer resp.Body.Close()
	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	writeJSON(w, resp.StatusCode, result)
}

func QR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}

	resp, err := proxyToWA(http.MethodGet, "/qr", nil)
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": "wa-service unreachable"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK && strings.HasPrefix(resp.Header.Get("Content-Type"), "image/") {
		w.Header().Set("Content-Type", "image/png")
		io.Copy(w, resp.Body)
	} else {
		var result map[string]string
		json.NewDecoder(resp.Body).Decode(&result)
		writeJSON(w, resp.StatusCode, result)
	}
}

func Send(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}

	username, role, ok := requireAny(w, r)
	if !ok {
		return
	}

	var body struct {
		Message  string              `json:"message"`
		Period   string              `json:"period"`
		Group    string              `json:"group"`
		Phones   []string            `json:"phones"`
		Messages []string            `json:"messages,omitempty"`
		DelayMs  int                 `json:"delay_ms"`
		RowVars  []map[string]string `json:"row_vars,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	// Only superadmin can send broadcasts
	if role != "superadmin" {
		writeJSON(w, 403, map[string]string{"error": "only superadmin can send broadcasts"})
		return
	}

	// Per-contact personalized messages (messages array matches phones array)
	usePerContact := len(body.Phones) > 0 && len(body.Messages) == len(body.Phones)

	var blogID primitive.ObjectID
	var err error

	if usePerContact {
		if len(body.Phones) == 0 {
			writeJSON(w, 400, map[string]string{"error": "no contacts found"})
			return
		}

		blog := db.BroadcastLog{
			Message:        body.Message,
			TotalReceivers: len(body.Phones),
			SentBy:         username,
		}
		blogID, err = db.CreateBroadcastLog(blog)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}

		broadcastProgress(map[string]any{
			"type":  "broadcast_started",
			"id":    blogID.Hex(),
			"total": len(body.Phones),
		})

		go sendPerContact(blogID, body.Phones, body.Messages, body.DelayMs)

		writeJSON(w, 200, map[string]any{
			"status": "sending",
			"log_id": blogID.Hex(),
			"total":  len(body.Phones),
		})
		return
	}

	// Original bulk send path
	if body.Message == "" {
		writeJSON(w, 400, map[string]string{"error": "message is required"})
		return
	}

	var contacts []db.BroadcastContact

	if len(body.Phones) > 0 {
		for _, p := range body.Phones {
			contacts = append(contacts, db.BroadcastContact{Phone: p, Name: p})
		}
	} else {
		if body.Period == "" {
			body.Period = "ALL"
		}
		contacts, err = db.GetBroadcastContacts(body.Period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
	}

	if len(contacts) == 0 {
		writeJSON(w, 400, map[string]string{"error": "no contacts found"})
		return
	}

	numbers := make([]string, len(contacts))
	for i, c := range contacts {
		numbers[i] = c.Phone
	}

	blog := db.BroadcastLog{
		Message:        body.Message,
		TotalReceivers: len(contacts),
		SentBy:         username,
	}
	blogID, err = db.CreateBroadcastLog(blog)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	delayMs := 0
	if body.DelayMs > 0 {
		delayMs = body.DelayMs
	}
	sendBody, _ := json.Marshal(map[string]any{
		"numbers":  numbers,
		"message":  body.Message,
		"delay_ms": delayMs,
	})

	broadcastProgress(map[string]any{
		"type":  "broadcast_started",
		"id":    blogID.Hex(),
		"total": len(contacts),
	})

	resp, err := proxyToWA(http.MethodPost, "/send-bulk", strings.NewReader(string(sendBody)))
	if err != nil {
		now := time.Now()
		db.UpdateBroadcastLog(blogID, map[string]any{
			"status":       "failed",
			"completed_at": &now,
		})
		writeJSON(w, 502, map[string]string{"error": "wa-service unreachable"})
		return
	}
	defer resp.Body.Close()

	var jobResp struct {
		JobID  string `json:"job_id"`
		Status string `json:"status"`
	}
	json.NewDecoder(resp.Body).Decode(&jobResp)

	if resp.StatusCode != 200 {
		now := time.Now()
		db.UpdateBroadcastLog(blogID, map[string]any{
			"status":       "failed",
			"completed_at": &now,
		})
		writeJSON(w, resp.StatusCode, map[string]string{"error": "failed to start broadcast"})
		return
	}

	go pollJobCompletion(blogID, jobResp.JobID, contacts)

	writeJSON(w, 200, map[string]any{
		"status": "sending",
		"log_id": blogID.Hex(),
		"job_id": jobResp.JobID,
		"total":  len(contacts),
	})
}

func sendPerContact(blogID primitive.ObjectID, phones []string, messages []string, delayMs int) {
	sentCount := 0
	failedCount := 0
	now := time.Now()
	var recipientLogs []db.BroadcastRecipientLog

	for i, phone := range phones {
		msg := messages[i]
		singleBody, _ := json.Marshal(map[string]any{
			"number":  phone,
			"message": msg,
		})
		resp, err := proxyToWA(http.MethodPost, "/send", strings.NewReader(string(singleBody)))
		status := "sent"
		errMsg := ""
		if err != nil {
			status = "failed"
			errMsg = err.Error()
		} else {
			resp.Body.Close()
			if resp.StatusCode != 200 {
				status = "failed"
				errMsg = "wa-service error: " + resp.Status
			}
		}

		if status == "sent" {
			sentCount++
		} else {
			failedCount++
		}
		recipientLogs = append(recipientLogs, db.BroadcastRecipientLog{
			LogID:  blogID,
			Phone:  phone,
			Status: status,
			Error:  errMsg,
			SentAt: &now,
		})

		broadcastProgress(map[string]any{
			"type":       "broadcast_progress",
			"id":         blogID.Hex(),
			"sent":       sentCount,
			"failed":     failedCount,
			"total":      len(phones),
			"percentage": float64(sentCount+failedCount) / float64(len(phones)) * 100,
		})

		if i < len(phones)-1 && delayMs > 0 {
			time.Sleep(time.Duration(delayMs) * time.Millisecond)
		}
	}

	completedAt := time.Now()
	finalStatus := "done"
	if failedCount == len(phones) {
		finalStatus = "failed"
	} else if failedCount > 0 {
		finalStatus = "partial"
	}

	db.UpdateBroadcastLog(blogID, map[string]any{
		"status":       finalStatus,
		"sent_count":   sentCount,
		"failed_count": failedCount,
		"completed_at": &completedAt,
	})

	if len(recipientLogs) > 0 {
		db.CreateRecipientLogs(recipientLogs)
	}

	broadcastProgress(map[string]any{
		"type":   "broadcast_completed",
		"id":     blogID.Hex(),
		"status": finalStatus,
		"sent":   sentCount,
		"failed": failedCount,
		"total":  len(phones),
	})
}

func pollJobCompletion(blogID primitive.ObjectID, jobID string, contacts []db.BroadcastContact) {
	client := &http.Client{Timeout: 300 * time.Second}
	sentCount := 0
	failedCount := 0
	var recipientLogs []db.BroadcastRecipientLog

	for i := 0; i < 60; i++ { // max 5 minutes (60 * 5s)
		time.Sleep(5 * time.Second)

		resp, err := client.Get(waServiceURL + "/job/" + jobID)
		if err != nil {
			continue
		}

		var job struct {
			Status      string `json:"status"`
			SentCount   int    `json:"sent_count"`
			FailedCount int    `json:"failed_count"`
			Results     []struct {
				Phone string `json:"phone"`
				Error string `json:"error,omitempty"`
			} `json:"results"`
		}
		json.NewDecoder(resp.Body).Decode(&job)
		resp.Body.Close()

		if job.SentCount > 0 {
			sentCount = job.SentCount
		}
		if job.FailedCount > 0 {
			failedCount = job.FailedCount
		}

		broadcastProgress(map[string]any{
			"type":       "broadcast_progress",
			"id":         blogID.Hex(),
			"sent":       sentCount,
			"failed":     failedCount,
			"total":      len(contacts),
			"percentage": float64(sentCount+failedCount) / float64(len(contacts)) * 100,
		})

		if job.Status == "done" {
			now := time.Now()
			for _, r := range job.Results {
				status := "sent"
				if r.Error != "" {
					status = "failed"
				}
				_ = findContactID(contacts, r.Phone)
				recipientLogs = append(recipientLogs, db.BroadcastRecipientLog{
					LogID:  blogID,
					Phone:  r.Phone,
					Status: status,
					Error:  r.Error,
					SentAt: &now,
				})
			}
			break
		}
	}

	now := time.Now()
	status := "done"
	if failedCount == len(contacts) {
		status = "failed"
	} else if failedCount > 0 {
		status = "partial"
	}

	db.UpdateBroadcastLog(blogID, map[string]any{
		"status":       status,
		"sent_count":   sentCount,
		"failed_count": failedCount,
		"completed_at": &now,
	})

	if len(recipientLogs) > 0 {
		db.CreateRecipientLogs(recipientLogs)
	}

	broadcastProgress(map[string]any{
		"type":   "broadcast_completed",
		"id":     blogID.Hex(),
		"status": status,
		"sent":   sentCount,
		"failed": failedCount,
		"total":  len(contacts),
	})
}

func findContactID(contacts []db.BroadcastContact, phone string) primitive.ObjectID {
	normalized := normalizePhoneLocal(phone)
	for _, c := range contacts {
		if normalizePhoneLocal(c.Phone) == normalized {
			return c.ID
		}
	}
	return primitive.NilObjectID
}

func normalizePhoneLocal(phone string) string {
	var b strings.Builder
	for _, c := range phone {
		if c >= '0' && c <= '9' {
			b.WriteRune(c)
		}
	}
	s := b.String()
	if len(s) > 0 && s[0] == '0' {
		s = "62" + s[1:]
	}
	return s
}

func Logs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}

	logs, err := db.GetBroadcastLogs(0)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, logs)
}

func LogDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/broadcast/logs/")
	id = strings.Trim(id, "/")
	if id == "" {
		writeJSON(w, 400, map[string]string{"error": "id required"})
		return
	}

	logEntry, err := db.GetBroadcastLog(id)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": "not found"})
		return
	}

	recipients, err := db.GetRecipientLogs(id)
	if err != nil {
		recipients = []db.BroadcastRecipientLog{}
	}

	writeJSON(w, 200, map[string]any{
		"log":        logEntry,
		"recipients": recipients,
	})
}

func AnggotaContacts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	period := r.URL.Query().Get("period")
	if period == "ALL" {
		period = ""
	}
	members, err := db.GetMembers(period)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	type contactRow struct {
		FullName     string `json:"full_name"`
		Nickname     string `json:"nickname"`
		Phone        string `json:"phone"`
		Department   string `json:"department"`
		Position     string `json:"position"`
		ProgramStudi string `json:"program_studi"`
		Fakultas     string `json:"fakultas"`
		Angkatan     string `json:"angkatan"`
	}
	rows := make([]contactRow, 0)
	for _, m := range members {
		if m.Phone == "" {
			continue
		}
		rows = append(rows, contactRow{
			FullName:     m.FullName,
			Nickname:     m.Nickname,
			Phone:        m.Phone,
			Department:   m.Department,
			Position:     m.Position,
			ProgramStudi: m.ProgramStudi,
			Fakultas:     m.Fakultas,
			Angkatan:     m.Angkatan,
		})
	}
	writeJSON(w, 200, rows)
}

// renderBCMessage replaces {{var}} and {{if var == "val"}}...{{else}}...{{endif}}
func renderBCMessage(tmpl string, vars map[string]string) string {
	re := regexp.MustCompile(`\{\{if\s+(\w+)\s*==\s*"([^"]*?)"\}\}(.*?)\{\{else\}\}(.*?)\{\{endif\}\}`)
	tmpl = re.ReplaceAllStringFunc(tmpl, func(match string) string {
		sub := re.FindStringSubmatch(match)
		if len(sub) < 5 {
			return match
		}
		colName := sub[1]
		compareVal := sub[2]
		trueBody := sub[3]
		falseBody := sub[4]
		actual := vars[colName]
		if actual == compareVal {
			return trueBody
		}
		return falseBody
	})
	for k, v := range vars {
		tmpl = strings.ReplaceAll(tmpl, "{{"+k+"}}", v)
	}
	return tmpl
}

func Disconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	if !requireSuperAdmin(w, r) {
		return
	}
	resp, err := proxyToWA(http.MethodPost, "/logout", nil)
	if err != nil {
		writeJSON(w, 502, map[string]string{"error": "wa-service unreachable"})
		return
	}
	defer resp.Body.Close()
	var result map[string]any
	json.NewDecoder(resp.Body).Decode(&result)
	writeJSON(w, resp.StatusCode, result)
}

func WebSocket(w http.ResponseWriter, r *http.Request) {
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Broadcast] WebSocket upgrade failed: %v", err)
		return
	}

	wsHub.register <- conn

	go func() {
		defer func() {
			conn.Close()
			wsHub.unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				break
			}
		}
	}()
}

func MembersWithPhone(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	_, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	period := r.URL.Query().Get("period")
	if period == "ALL" {
		period = ""
	}
	filter := bson.M{"phone": bson.M{"$ne": ""}}
	if period != "" && period != "ALL" {
		filter["period_label"] = period
	}
	members, err := db.GetMembersFiltered(filter)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	type memberPhone struct {
		ID         string `json:"id"`
		FullName   string `json:"full_name"`
		Department string `json:"department"`
		Position   string `json:"position"`
		Phone      string `json:"phone"`
		Period     string `json:"period_label"`
	}
	result := make([]memberPhone, 0)
	for _, m := range members {
		result = append(result, memberPhone{
			ID:         m.ID.Hex(),
			FullName:   m.FullName,
			Department: m.Department,
			Position:   m.Position,
			Phone:      m.Phone,
			Period:     m.PeriodLabel,
		})
	}
	writeJSON(w, 200, result)
}


// ── Session Handlers ───────────────────────────────────────────────────────

func SessionHandler(w http.ResponseWriter, r *http.Request) {
	username, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	switch r.Method {
	case http.MethodGet:
		session, err := db.GetLatestDraftSession(username)
		if err != nil || session == nil {
			writeJSON(w, 200, map[string]any{
				"session": map[string]any{
					"id":       "",
					"columns":  []string{},
					"labels":   []string{},
					"rows":     []map[string]string{},
					"template": "",
					"delay_ms": 3000,
					"status":   "draft",
				},
			})
			return
		}
		writeJSON(w, 200, map[string]any{"session": session})
	case http.MethodPut:
		var body struct {
			SessionID string              `json:"session_id"`
			Columns   []string            `json:"columns"`
			Labels    []string            `json:"labels"`
			Rows      []map[string]string `json:"rows"`
			Template  string              `json:"template"`
			DelayMs   int                 `json:"delay_ms"`
			Period    string              `json:"period"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		var sessionID primitive.ObjectID
		var err error
		if body.SessionID != "" {
			sessionID, err = primitive.ObjectIDFromHex(body.SessionID)
			if err != nil {
				writeJSON(w, 400, map[string]string{"error": "invalid session_id"})
				return
			}
			err = db.UpdateBroadcastSession(body.SessionID, map[string]any{
				"columns":  body.Columns,
				"labels":   body.Labels,
				"rows":     body.Rows,
				"template": body.Template,
				"delay_ms": body.DelayMs,
				"period":   body.Period,
			})
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
		} else {
			s := db.BroadcastSession{
				UserID:   username,
				Username: username,
				Period:   body.Period,
				Status:   "draft",
				Columns:  body.Columns,
				Labels:   body.Labels,
				Rows:     body.Rows,
				Template: body.Template,
				DelayMs:  body.DelayMs,
			}
			if s.DelayMs == 0 {
				s.DelayMs = 3000
			}
			sessionID, err = db.CreateBroadcastSession(s)
			if err != nil {
				writeJSON(w, 500, map[string]string{"error": err.Error()})
				return
			}
		}
		writeJSON(w, 200, map[string]any{"session_id": sessionID.Hex()})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func SessionByIDHandler(w http.ResponseWriter, r *http.Request) {
	username, _, ok := requireAny(w, r)
	if !ok {
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/api/broadcast/session/")
	id = strings.Trim(id, "/")
	if id == "" {
		writeJSON(w, 400, map[string]string{"error": "id required"})
		return
	}
	switch r.Method {
	case http.MethodGet:
		session, err := db.GetBroadcastSession(id)
		if err != nil || session == nil {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		if session.UserID != username {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		writeJSON(w, 200, map[string]any{"session": session})
	case http.MethodDelete:
		session, err := db.GetBroadcastSession(id)
		if err != nil || session == nil {
			writeJSON(w, 404, map[string]string{"error": "not found"})
			return
		}
		if session.UserID != username {
			writeJSON(w, 403, map[string]string{"error": "forbidden"})
			return
		}
		if err := db.DeleteBroadcastSession(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "deleted"})
	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}
