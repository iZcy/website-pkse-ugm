package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	wa "wa-service/whatsapp"
)

var (
	jobs   = make(map[string]*BroadcastJob)
	jobsMu sync.Mutex
)

type BroadcastJob struct {
	ID          string            `json:"id"`
	Numbers     []string          `json:"numbers"`
	Message     string            `json:"message"`
	Results     []wa.SendResult   `json:"results"`
	Status      string            `json:"status"` // pending, sending, done
	SentCount   int               `json:"sent_count"`
	FailedCount int               `json:"failed_count"`
	Total       int               `json:"total"`
	CreatedAt   time.Time         `json:"created_at"`
}

func main() {
	port := os.Getenv("WA_SERVICE_PORT")
	if port == "" {
		port = "8081"
	}

	wa.Init()

	mux := http.NewServeMux()

	mux.HandleFunc("/status", handleStatus)
	mux.HandleFunc("/qr", handleQR)
	mux.HandleFunc("/send", handleSend)
	mux.HandleFunc("/send-bulk", handleSendBulk)
	mux.HandleFunc("/job/", handleJobStatus)
	mux.HandleFunc("/logout", handleLogout)

	addr := fmt.Sprintf(":%s", port)
	log.Printf("[WA-Service] Running on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{
		"connected": wa.IsConnected(),
	})
}

func handleQR(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}

	if wa.IsConnected() {
		writeJSON(w, 200, map[string]string{"status": "already_connected"})
		return
	}

	qr, ready := wa.GetQR()
	if !ready {
		writeJSON(w, 202, map[string]string{"status": "qr_not_ready"})
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.Write(qr)
}

func handleSend(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}

	var body struct {
		To      string `json:"to"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	if body.To == "" || body.Message == "" {
		writeJSON(w, 400, map[string]string{"error": "to and message required"})
		return
	}

	if err := wa.SendText(body.To, body.Message); err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, 200, map[string]string{"status": "sent"})
}

func handleSendBulk(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}

	var body struct {
		Numbers []string `json:"numbers"`
		Message string   `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}

	if len(body.Numbers) == 0 || body.Message == "" {
		writeJSON(w, 400, map[string]string{"error": "numbers and message required"})
		return
	}

	jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())
	job := &BroadcastJob{
		ID:      jobID,
		Numbers: body.Numbers,
		Message: body.Message,
		Total:   len(body.Numbers),
		Status:  "sending",
	}

	jobsMu.Lock()
	jobs[jobID] = job
	jobsMu.Unlock()

	// Send asynchronously
	go func() {
		results := wa.SendBulk(body.Numbers, body.Message)
		jobsMu.Lock()
		job.Results = results
		job.Status = "done"
		for _, r := range results {
			if r.Error != "" {
				job.FailedCount++
			} else {
				job.SentCount++
			}
		}
		jobsMu.Unlock()
	}()

	writeJSON(w, 200, map[string]string{"job_id": jobID, "status": "sending"})
}

func handleJobStatus(w http.ResponseWriter, r *http.Request) {
	jobID := strings.TrimPrefix(r.URL.Path, "/job/")
	jobID = strings.Trim(jobID, "/")

	jobsMu.Lock()
	job, ok := jobs[jobID]
	jobsMu.Unlock()

	if !ok {
		writeJSON(w, 404, map[string]string{"error": "job not found"})
		return
	}

	writeJSON(w, 200, job)
}

func handleTest(w http.ResponseWriter, r *http.Request) {
	// Simple echo endpoint for testing connectivity
	io.WriteString(w, "wa-service is running")
}

func handleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	wa.Disconnect()
	// The event handler in handler.go auto-reconnects after 5s on Disconnected event,
	// which will generate a new QR code.
	writeJSON(w, 200, map[string]string{"status": "disconnected"})
}
