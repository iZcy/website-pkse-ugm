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
"webapp/internal/seed"
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

seed.Run()
admin.Init()

mux := http.NewServeMux()

fs := http.FileServer(http.Dir("./static"))
mux.Handle("/static/", http.StripPrefix("/static", fs))

h := handlers.New()

// Public pages
mux.HandleFunc("/", h.Home)
mux.HandleFunc("/tentang-kami", h.TentangKami)
mux.HandleFunc("/anggota", h.Anggota)
mux.HandleFunc("/artikel", h.Artikel)
mux.HandleFunc("/artikel/", h.ArtikelDetail)
mux.HandleFunc("/pengumuman", h.Pengumuman)
mux.HandleFunc("/periode", h.Periode)
mux.HandleFunc("/periode/", h.PeriodeDetail)

// Public API
mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

// Admin panel
mux.HandleFunc("/admin", admin.Login)
mux.HandleFunc("/admin/logout", admin.Logout)
mux.HandleFunc("/admin/dashboard", admin.Dashboard)

// CMS API
mux.HandleFunc("/api/cms/global-setting", cms.GlobalSettingHandler)
mux.HandleFunc("/api/cms/period-about", cms.PeriodAboutHandler)
mux.HandleFunc("/api/cms/departments", cms.Departments)
mux.HandleFunc("/api/cms/departments/", cms.Departments)
mux.HandleFunc("/api/cms/members", cms.Members)
mux.HandleFunc("/api/cms/members/", cms.Members)
mux.HandleFunc("/api/cms/announcements", cms.Announcements)
mux.HandleFunc("/api/cms/announcements/", cms.Announcements)
mux.HandleFunc("/api/cms/articles", cms.Articles)
mux.HandleFunc("/api/cms/articles/", cms.Articles)
mux.HandleFunc("/api/cms/periods", cms.Periods)
mux.HandleFunc("/api/cms/periods/", cms.Periods)
mux.HandleFunc("/api/cms/accounts", cms.Accounts)
mux.HandleFunc("/api/cms/accounts/", cms.Accounts)

addr := fmt.Sprintf(":%s", port)
fmt.Printf("Server running at http://localhost%s\n", addr)
log.Fatal(http.ListenAndServe(addr, mux))
}
