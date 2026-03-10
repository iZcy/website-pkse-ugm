package main

import (
"fmt"
"log"
"net/http"
"os"

"webapp/internal/admin"
"webapp/internal/auth"
"webapp/internal/cms"
"webapp/internal/db"
"webapp/internal/handlers"
)

func main() {
port := os.Getenv("PORT")
if port == "" {
port = "8080"
}

auth.Init()

if err := db.Connect(); err != nil {
log.Fatalf("MongoDB connect: %v", err)
}
defer db.Disconnect()

admin.Init()

mux := http.NewServeMux()

fs := http.FileServer(http.Dir("./static"))
mux.Handle("/static/", http.StripPrefix("/static", fs))

h := handlers.New()
mux.HandleFunc("/", h.Home)
mux.HandleFunc("/about", h.About)
mux.HandleFunc("/announcements", h.Announcements)
mux.HandleFunc("/contact", h.Contact)
mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

mux.HandleFunc("/admin", admin.Login)
mux.HandleFunc("/admin/logout", admin.Logout)
mux.HandleFunc("/admin/dashboard", admin.Dashboard)

mux.HandleFunc("/api/cms/announcements", cms.Announcements)
mux.HandleFunc("/api/cms/announcements/", cms.Announcements)
mux.HandleFunc("/api/cms/departments", cms.Departments)
mux.HandleFunc("/api/cms/departments/", cms.Departments)
mux.HandleFunc("/api/cms/officers", cms.Officers)
mux.HandleFunc("/api/cms/officers/", cms.Officers)
mux.HandleFunc("/api/cms/site-setting", cms.SiteSetting)

addr := fmt.Sprintf(":%s", port)
fmt.Printf("Server running at http://localhost%s\n", addr)
log.Fatal(http.ListenAndServe(addr, mux))
}
