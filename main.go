package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"os"

	"webapp/internal/admin"
	"webapp/internal/auth"
	"webapp/internal/broadcast"
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

	// GridFS uploads - served from MongoDB
	mux.HandleFunc("/uploads/", cms.ServeUpload)

	// Redirect legacy /static/uploads/ URLs to /uploads/
	mux.HandleFunc("/static/uploads/", func(w http.ResponseWriter, r *http.Request) {
		newURL := "/uploads/" + strings.TrimPrefix(r.URL.Path, "/static/uploads/")
		http.Redirect(w, r, newURL, http.StatusMovedPermanently)
	})

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

	// New pages
	mux.HandleFunc("/program", h.Program)
	mux.HandleFunc("/faq-beasiswa", h.FAQ)
	mux.HandleFunc("/statistik", h.Statistik)
	mux.HandleFunc("/alumni", h.Alumni)
	mux.HandleFunc("/galeri", h.Galeri)
	mux.HandleFunc("/l/", h.ShortLinkRedirect)

	// Public API

	mux.HandleFunc("/api/announcements", h.AnnouncementsAPI)

	// Admin panel
	mux.HandleFunc("/login", admin.Login)
	mux.HandleFunc("/admin", admin.Login)
	mux.HandleFunc("/admin/logout", admin.Logout)
	mux.HandleFunc("/admin/dashboard", admin.Dashboard)
	mux.HandleFunc("/admin/pengumuman", admin.Pengumuman)
	mux.HandleFunc("/admin/artikel", admin.Artikel)
	mux.HandleFunc("/admin/departemen", admin.Departemen)
	mux.HandleFunc("/admin/program", admin.Program)
	mux.HandleFunc("/admin/tentang", admin.Tentang)
	mux.HandleFunc("/admin/galeri", admin.Galeri)
	mux.HandleFunc("/admin/statistik", admin.Statistik)
	mux.HandleFunc("/admin/anggota", admin.Anggota)
	mux.HandleFunc("/admin/global", admin.Global)
	mux.HandleFunc("/admin/shortlink", admin.Shortlink)
	mux.HandleFunc("/admin/broadcast", admin.Broadcast)
	mux.HandleFunc("/admin/faq-global", admin.FAQGlobal)
	mux.HandleFunc("/admin/global-stats", admin.GlobalStats)
	mux.HandleFunc("/admin/periode", admin.Periode)
	mux.HandleFunc("/admin/akun", admin.Akun)

	// CMS API

	// CMS newly added API
	mux.HandleFunc("/api/cms/programs", cms.Programs)
	mux.HandleFunc("/api/cms/programs/", cms.Programs)
	mux.HandleFunc("/api/cms/faqs", cms.FAQs)
	mux.HandleFunc("/api/cms/faqs/", cms.FAQs)
	mux.HandleFunc("/api/cms/shortlinks", cms.ShortLinks)
	mux.HandleFunc("/api/cms/shortlinks/", cms.ShortLinks)
	mux.HandleFunc("/api/cms/stats", cms.Stats)
	mux.HandleFunc("/api/cms/sync-stats", cms.SyncStatsTemplate)
	mux.HandleFunc("/api/cms/stats/", cms.Stats)

	mux.HandleFunc("/api/cms/global-setting", cms.GlobalSettingHandler)
	mux.HandleFunc("/api/cms/period-about", cms.PeriodAboutHandler)
	mux.HandleFunc("/api/cms/departments", cms.Departments)
	mux.HandleFunc("/api/cms/departments/", cms.Departments)
	mux.HandleFunc("/api/cms/bulk-create", cms.BulkCreate)
	mux.HandleFunc("/api/cms/batch-update-members", cms.BatchUpdateMembers)
	mux.HandleFunc("/api/cms/batch-update-departments", cms.BatchUpdateDepartments)
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
	mux.HandleFunc("/api/cms/upload", cms.Upload)

	// Broadcast API
	mux.HandleFunc("/api/broadcast/ws", broadcast.WebSocket)
	mux.HandleFunc("/api/broadcast/status", broadcast.Status)
	mux.HandleFunc("/api/broadcast/qr", broadcast.QR)
	mux.HandleFunc("/api/broadcast/send", broadcast.Send)
	mux.HandleFunc("/api/broadcast/disconnect", broadcast.Disconnect)
	mux.HandleFunc("/api/broadcast/anggota-contacts", broadcast.AnggotaContacts)
	mux.HandleFunc("/api/broadcast/logs", broadcast.Logs)
	mux.HandleFunc("/api/broadcast/logs/", broadcast.LogDetail)
	mux.HandleFunc("/api/broadcast/members-phone", broadcast.MembersWithPhone)

	addr := fmt.Sprintf(":%s", port)
	fmt.Printf("Server running at http://localhost%s\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
