package whatsapp

import (
	"log"
	"time"

	"go.mau.fi/whatsmeow/types/events"
)

func handleEvent(evt interface{}) {
	switch v := evt.(type) {
	case *events.QR:
		log.Println("[WA] QR code received")
		setQR(v.Codes[0])
	case *events.Connected:
		log.Println("[WA] Connected to WhatsApp")
		setConnected(true)
	case *events.Disconnected:
		log.Println("[WA] Disconnected, reconnecting in 5s...")
		setConnected(false)
		go func() {
			time.Sleep(5 * time.Second)
			if !IsConnected() {
				log.Println("[WA] Attempting reconnect...")
				if err := GetClient().Connect(); err != nil {
					log.Printf("[WA] Reconnect failed: %v", err)
				}
			}
		}()
	case *events.StreamReplaced:
		log.Println("[WA] Stream replaced (another connection)")
		setConnected(false)
	case *events.Message:
		// Ignore incoming messages
	default:
		// log.Printf("[WA] Event: %T", v)
	}
}
