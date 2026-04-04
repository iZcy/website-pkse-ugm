package whatsapp

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"github.com/skip2/go-qrcode"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	waLog "go.mau.fi/whatsmeow/util/log"
)

var (
	client    *whatsmeow.Client
	mu        sync.Mutex
	qrBytes   []byte
	qrReady   bool
	connected bool
)

func Init() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	os.MkdirAll("/app/wa-session", 0755)

	dbLog := waLog.Stdout("WA-DB", "INFO", false)
	container, err := sqlstore.New(ctx, "sqlite3", "file:/app/wa-session/wa-session.db?_foreign_keys=1", dbLog)
	if err != nil {
		log.Printf("[WA] Failed to open session DB: %v", err)
		return
	}

	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		log.Printf("[WA] Failed to get device: %v", err)
		return
	}

	clientLog := waLog.Stdout("WA", "INFO", false)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(handleEvent)

	if client.Store.ID == nil {
		log.Println("[WA] No saved session, will request QR scan")
	}

	err = client.Connect()
	if err != nil {
		log.Printf("[WA] Failed to connect: %v", err)
	}
}

func GetClient() *whatsmeow.Client {
	return client
}

func IsConnected() bool {
	mu.Lock()
	defer mu.Unlock()
	return connected
}

func buildTextMessage(text string) *waE2E.Message {
	return &waE2E.Message{
		Conversation: &text,
	}
}

func SendText(to, message string) error {
	if client == nil {
		return fmt.Errorf("whatsapp client not initialized")
	}
	if !IsConnected() {
		return fmt.Errorf("whatsapp not connected")
	}

	recipient, err := parseJID(to)
	if err != nil {
		return fmt.Errorf("invalid phone number %s: %w", to, err)
	}

	_, err = client.SendMessage(context.Background(), recipient, buildTextMessage(message))
	return err
}

type SendResult struct {
	Phone string `json:"phone"`
	Error string `json:"error,omitempty"`
}

func SendBulk(numbers []string, message string) []SendResult {
	if client == nil {
		return []SendResult{{Error: "whatsapp client not initialized"}}
	}
	if !IsConnected() {
		return []SendResult{{Error: "whatsapp not connected"}}
	}

	results := make([]SendResult, 0, len(numbers))
	msg := buildTextMessage(message)
	for _, num := range numbers {
		recipient, err := parseJID(num)
		if err != nil {
			results = append(results, SendResult{Phone: num, Error: err.Error()})
			continue
		}

		_, err = client.SendMessage(context.Background(), recipient, msg)
		if err != nil {
			results = append(results, SendResult{Phone: num, Error: err.Error()})
		} else {
			results = append(results, SendResult{Phone: num})
		}
	}
	return results
}

func Disconnect() {
	mu.Lock()
	connected = false
	qrReady = false
	qrBytes = nil
	mu.Unlock()
	if client != nil {
		client.Disconnect()
	}
	// Auto-reconnect after disconnect to generate fresh QR
	go func() {
		time.Sleep(3 * time.Second)
		log.Println("[WA] Reconnecting after disconnect...")
		if client != nil {
			if err := client.Connect(); err != nil {
				log.Printf("[WA] Reconnect failed: %v", err)
			}
		}
	}()
}

func GetQR() ([]byte, bool) {
	mu.Lock()
	defer mu.Unlock()
	return qrBytes, qrReady
}

func setConnected(v bool) {
	mu.Lock()
	defer mu.Unlock()
	connected = v
}

func setQR(text string) {
	qrPNG, err := qrcode.Encode(text, qrcode.Medium, 256)
	if err != nil {
		log.Printf("[WA] Failed to generate QR: %v", err)
		return
	}

	mu.Lock()
	qrBytes = qrPNG
	qrReady = true
	mu.Unlock()
}

func parseJID(phone string) (types.JID, error) {
	phone = cleanPhone(phone)
	if len(phone) < 10 {
		return types.NewJID("", types.DefaultUserServer), fmt.Errorf("phone number too short: %s", phone)
	}
	return types.NewJID(phone+"@s.whatsapp.net", types.DefaultUserServer), nil
}

func cleanPhone(phone string) string {
	var b strings.Builder
	b.Grow(len(phone))
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
