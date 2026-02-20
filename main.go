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
	cfg := config.Load()

	db, err := sql.Open("sqlite3", cfg.DatabasePath)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	if err := config.RunMigrations(db); err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static", fs))

	h := handlers.New(db)
	mux.HandleFunc("/", h.Home)
	mux.HandleFunc("/about", h.About)
	mux.HandleFunc("/announcements", h.Announcements)
	mux.HandleFunc("/contact", h.Contact)
	mux.HandleFunc("/tentang-rani", h.ProfileRani)
	mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("Server running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
