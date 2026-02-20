package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"webapp/internal/config"
	"webapp/internal/handlers"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Load config
	cfg := config.Load()

	// Initialize database
	db, err := sql.Open("sqlite3", cfg.DatabasePath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Run migrations
	if err := config.RunMigrations(db); err != nil {
		log.Fatal(err)
	}

	// Setup routes
	mux := http.NewServeMux()

	// Static files
	fs := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static", fs))

	// Handlers
	h := handlers.New(db)
	mux.HandleFunc("/", h.Home)
	mux.HandleFunc("/about", h.About)
	mux.HandleFunc("/announcements", h.Announcements)
	mux.HandleFunc("/contact", h.Contact)
	mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

	// Start server
	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("Server running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
