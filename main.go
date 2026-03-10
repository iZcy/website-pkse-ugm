package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"webapp/internal/handlers"
	"webapp/internal/strapi"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	strapiURL := os.Getenv("STRAPI_URL")
	if strapiURL == "" {
		strapiURL = "http://127.0.0.1:1337"
	}

	sc := strapi.New(strapiURL)

	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir("./static"))
	mux.Handle("/static/", http.StripPrefix("/static", fs))

	h := handlers.New(sc)
	mux.HandleFunc("/", h.Home)
	mux.HandleFunc("/about", h.About)
	mux.HandleFunc("/announcements", h.Announcements)
	mux.HandleFunc("/contact", h.Contact)
	mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

	addr := fmt.Sprintf(":%s", port)
	fmt.Printf("Server running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
