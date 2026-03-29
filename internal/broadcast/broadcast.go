package broadcast

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

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
	clients   map[*websocket.Conn]bool
	broadcast chan []byte
	register  chan *websocket.Conn
	unregister chan *websocket.Conn
}

var wsHub = &hub{
	clients:   make(map[*websocket.Conn]bool),
	broadcast: make(chan []byte, 100),
	register:  make(chan *websocket.Conn),
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

func Contacts(w http.ResponseWriter, r *http.Request) {
	if !requireSuperAdmin(w, r) {
		return
	}

	switch r.Method {
	case http.MethodGet:
		period := r.URL.Query().Get("period")
		contacts, err := db.GetBroadcastContacts(period)
		if err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, contacts)

	case http.MethodPost:
		var c db.BroadcastContact
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			writeJSON(w, 400, map[string]string{"error": err.Error()})
			return
		}
		if c.Phone == "" {
			writeJSON(w, 400, map[string]string{"error": "phone is required"})
			return
		}
		if err := db.CreateBroadcastContact(c); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	case http.MethodDelete:
		id := strings.TrimPrefix(r.URL.Path, "/api/broadcast/contacts/")
		id = strings.Trim(id, "/")
		if id == "" {
			writeJSON(w, 400, map[string]string{"error": "id required"})
			return
		}
		if err := db.DeleteBroadcastContact(id); err != nil {
			writeJSON(w, 500, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, 200, map[string]string{"status": "ok"})

	default:
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
	}
}

func ImportContacts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	if !requireSuperAdmin(w, r) {
		return
	}

	var body struct {
		Contacts []db.BroadcastContact `json:"contacts"`
		Period   string                `json:"period"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	if len(body.Contacts) == 0 {
		writeJSON(w, 400, map[string]string{"error": "contacts array is empty"})
		return
	}

	// Apply period to all contacts if specified
	for i := range body.Contacts {
		if body.Period != "" && body.Contacts[i].Period == "" {
			body.Contacts[i].Period = body.Period
		}
	}

	if err := db.BulkCreateBroadcastContacts(body.Contacts); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 200, map[string]any{"status": "ok", "count": len(body.Contacts)})
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
		Message string   `json:"message"`
		Period  string   `json:"period"`
		Group   string   `json:"group"`
		Phones  []string `json:"phones"`
		DelayMs int      `json:"delay_ms"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	if body.Message == "" {
		writeJSON(w, 400, map[string]string{"error": "message is required"})
		return
	}

	// Resolve contacts
	var contacts []db.BroadcastContact
	var err error

	if len(body.Phones) > 0 {
		// Direct phone numbers
		for _, p := range body.Phones {
			contacts = append(contacts, db.BroadcastContact{Phone: p, Name: p})
		}
	} else {
		// Load from DB based on period/group
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

	// Only superadmin can send broadcasts
	if role != "superadmin" {
		writeJSON(w, 403, map[string]string{"error": "only superadmin can send broadcasts"})
		return
	}

	// Create broadcast log
	numbers := make([]string, len(contacts))
	for i, c := range contacts {
		numbers[i] = c.Phone
	}

	blog := db.BroadcastLog{
		Message:        body.Message,
		TotalReceivers: len(contacts),
		SentBy:         username,
	}
	blogID, err := db.CreateBroadcastLog(blog)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	// Send via WA service
	delayMs := 0
	if body.DelayMs > 0 {
		delayMs = body.DelayMs
	}
	sendBody, _ := json.Marshal(map[string]any{
		"numbers": numbers,
		"message": body.Message,
		"delay_ms": delayMs,
	})

	broadcastProgress(map[string]any{
		"type": "broadcast_started",
		"id":   blogID.Hex(),
		"total": len(contacts),
	})

	resp, err := proxyToWA(http.MethodPost, "/send-bulk", strings.NewReader(string(sendBody)))
	if err != nil {
		// Update log as failed
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

	// Poll for job completion in background
	go pollJobCompletion(blogID, jobResp.JobID, contacts)

	writeJSON(w, 200, map[string]any{
		"status":   "sending",
		"log_id":   blogID.Hex(),
		"job_id":   jobResp.JobID,
		"total":    len(contacts),
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
			"type":         "broadcast_progress",
			"id":           blogID.Hex(),
			"sent":         sentCount,
			"failed":       failedCount,
			"total":        len(contacts),
			"percentage":   float64(sentCount+failedCount) / float64(len(contacts)) * 100,
		})

		if job.Status == "done" {
			// Build recipient logs
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

	// Update broadcast log
	now := time.Now()
	status := "done"
	if failedCount == len(contacts) {
		status = "failed"
	} else if failedCount > 0 {
		status = "partial"
	}

	db.UpdateBroadcastLog(blogID, map[string]any{
		"status":        status,
		"sent_count":    sentCount,
		"failed_count":  failedCount,
		"completed_at":  &now,
	})

	// Save recipient logs
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
	// Normalize phone for comparison
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

	// Send current status
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
			// Client messages ignored - this is a one-way broadcast channel
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
