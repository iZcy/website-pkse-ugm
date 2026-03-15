package seed

import (
	"log"
	"time"

	"webapp/internal/auth"
	"webapp/internal/db"
)

func hasUser(username string) bool {
	_, err := db.GetUserByUsername(username)
	return err == nil
}

func ensureUser(username, role, assignedPeriod string) {
	if hasUser(username) {
		return
	}
	hash, err := auth.HashPassword("admin123")
	if err != nil {
		log.Printf("[seed] hash %s: %v", username, err)
		return
	}
	u := db.User{
		ID:             username,
		Username:       username,
		PasswordHash:   hash,
		Role:           role,
		AssignedPeriod: assignedPeriod,
		CreatedAt:      time.Now(),
	}
	if err := db.CreateUser(u); err != nil {
		log.Printf("[seed] create user %s: %v", username, err)
	}
}

func Run() {
	log.Println("[seed] checking if seeding needed...")

	periodCount, err := db.CountPeriods()
	if err == nil && periodCount > 0 {
		return
	}

	log.Println("[seed] seeding initial data ...")

	// Keep existing superadmin if already present, and ensure helper admins exist.
	ensureUser("superadmin", "superadmin", "")
	ensureUser("admin2526", "admin", "25.26")
	ensureUser("admin2425", "admin", "24.25")

	if err := db.UpsertGlobalSetting(db.GlobalSetting{
		OrgName:   "PKSE UGM",
		LogoURL:   "https://placehold.co/200x80/1a3a6b/ffffff?text=PKSE+UGM",
		AboutHTML: `<p>PKSE UGM adalah organisasi mahasiswa ekonomi yang berfokus pada kajian, riset, dan pengembangan kapasitas intelektual.</p>`,
		SocialMedia: db.SocialMedia{
			Instagram: "https://instagram.com/pkseugm",
			Twitter:   "https://twitter.com/pkseugm",
			YouTube:   "https://youtube.com/@pkseugm",
			LinkedIn:  "https://linkedin.com/company/pkseugm",
		},
	}); err != nil {
		log.Printf("[seed] global setting: %v", err)
	}

	periods := []db.Period{
		{
			Label:             "24.25",
			DisplayName:       "Kepengurusan 2024/2025",
			IsActive:          false,
			HierarchyImageURL: "https://placehold.co/900x500/2563eb/ffffff?text=Struktur+Organisasi+2024/2025",
			HeroImageURL:      "https://placehold.co/1600x700/1d4ed8/ffffff?text=PKSE+24/25",
			SubPeriods:        []string{"Gelombang 1", "Gelombang 2"},
		},
		{
			Label:             "25.26",
			DisplayName:       "Kepengurusan 2025/2026",
			IsActive:          true,
			HierarchyImageURL: "https://placehold.co/900x500/1e40af/ffffff?text=Struktur+Organisasi+2025/2026",
			HeroImageURL:      "https://placehold.co/1600x700/1e40af/ffffff?text=PKSE+25/26",
			SubPeriods:        []string{"Gelombang 1", "Gelombang 2", "Gelombang 3"},
		},
	}
	for _, p := range periods {
		if err := db.CreatePeriod(p); err != nil {
			log.Printf("[seed] period %s: %v", p.Label, err)
		}
	}

	aboutData := []db.PeriodAbout{
		{
			PeriodLabel:       "24.25",
			Sejarah:           "Periode 24/25 menekankan penguatan budaya riset internal.",
			Visi:              "Menjadi organisasi ekonomi mahasiswa yang unggul dan berdampak.",
			Misi:              "Meningkatkan kualitas kajian, kaderisasi, dan kolaborasi eksternal.",
			HierarchyImageURL: "https://placehold.co/900x500/2563eb/ffffff?text=Struktur+24/25",
		},
		{
			PeriodLabel:       "25.26",
			Sejarah:           "Periode 25/26 berfokus pada ekspansi publikasi dan kemitraan.",
			Visi:              "Menjadi pusat kajian ekonomi mahasiswa yang kredibel secara nasional.",
			Misi:              "Memperluas jejaring, meningkatkan kualitas produk analisis, dan pengembangan SDM.",
			HierarchyImageURL: "https://placehold.co/900x500/1e40af/ffffff?text=Struktur+25/26",
		},
	}
	for _, pa := range aboutData {
		if err := db.UpsertPeriodAbout(pa); err != nil {
			log.Printf("[seed] period about %s: %v", pa.PeriodLabel, err)
		}
	}

	depts := []db.Department{
		{PeriodLabel: "24.25", Name: "Badan Pengurus Harian", Description: "Koordinasi organisasi", SortOrder: 1},
		{PeriodLabel: "24.25", Name: "Departemen Kajian & Riset", Description: "Kajian isu ekonomi", SortOrder: 2},
		{PeriodLabel: "25.26", Name: "Badan Pengurus Harian", Description: "Koordinasi organisasi", SortOrder: 1},
		{PeriodLabel: "25.26", Name: "Departemen Riset & Kebijakan", Description: "Riset dan kebijakan", SortOrder: 2},
		{PeriodLabel: "25.26", Name: "Departemen Pengembangan SDM", Description: "Kaderisasi dan pengembangan", SortOrder: 3},
	}
	for _, d := range depts {
		if err := db.CreateDepartment(d); err != nil {
			log.Printf("[seed] dept %s: %v", d.Name, err)
		}
	}

	// Canonical people data lives in members (scholars are merged into members).
	members := []db.Member{
		{
			PeriodLabel:   "24.25",
			SubPeriod:     "Gelombang 1",
			FullName:      "Andi Setiawan Rahardjo",
			Nickname:      "Andi",
			ProgramStudi:  "Ilmu Ekonomi",
			Fakultas:      "FEB UGM",
			Angkatan:      "2021",
			ActivePeriods: map[string]string{"24.25": "Gelombang 1"},
			PhotoURL:      "https://i.pravatar.cc/200?img=1",
			Department:    "Badan Pengurus Harian",
			Position:      "Ketua Umum",
			SortOrder:     1,
		},
		{
			PeriodLabel:   "25.26",
			SubPeriod:     "Gelombang 1",
			FullName:      "Hana Maharani Putri",
			Nickname:      "Hana",
			ProgramStudi:  "Akuntansi",
			Fakultas:      "FEB UGM",
			Angkatan:      "2022",
			ActivePeriods: map[string]string{"25.26": "Gelombang 1"},
			PhotoURL:      "https://i.pravatar.cc/200?img=8",
			Department:    "Badan Pengurus Harian",
			Position:      "Wakil Ketua",
			SortOrder:     2,
		},
		{
			PeriodLabel:   "25.26",
			SubPeriod:     "Gelombang 2",
			FullName:      "Muhammad Fadhil Akbar",
			Nickname:      "Fadhil",
			ProgramStudi:  "Manajemen",
			Fakultas:      "FEB UGM",
			Angkatan:      "2023",
			ActivePeriods: map[string]string{"25.26": "Gelombang 2"},
			PhotoURL:      "https://i.pravatar.cc/200?img=13",
			Department:    "Departemen Pengembangan SDM",
			Position:      "Kepala Departemen",
			SortOrder:     3,
		},
	}
	for _, m := range members {
		if err := db.CreateMember(m); err != nil {
			log.Printf("[seed] member %s: %v", m.FullName, err)
		}
	}

	announcements := []db.Announcement{
		{PeriodLabel: "25.26", Title: "Open Recruitment Anggota Baru", Content: "Pendaftaran dibuka 1-31 Oktober.", Published: true, CreatedAt: time.Now().Add(-7 * 24 * time.Hour), UpdatedAt: time.Now().Add(-7 * 24 * time.Hour)},
		{PeriodLabel: "25.26", Title: "Seminar Nasional Ekonomi", Content: "Seminar nasional akan digelar bulan depan.", Published: true, CreatedAt: time.Now().Add(-3 * 24 * time.Hour), UpdatedAt: time.Now().Add(-3 * 24 * time.Hour)},
	}
	for _, a := range announcements {
		if err := db.CreateAnnouncement(a); err != nil {
			log.Printf("[seed] announcement: %v", err)
		}
	}

	articles := []db.Article{
		{PeriodLabel: "25.26", Title: "Dampak AI terhadap Pasar Kerja", Slug: "dampak-ai-pasar-kerja", Excerpt: "Ringkasan dampak AI.", Content: "<p>Artikel AI.</p>", CoverURL: "https://placehold.co/800x450/1e40af/ffffff?text=AI", Published: true, CreatedAt: time.Now().Add(-10 * 24 * time.Hour), UpdatedAt: time.Now().Add(-10 * 24 * time.Hour)},
		{PeriodLabel: "25.26", Title: "Peran UMKM", Slug: "peran-umkm", Excerpt: "Ringkasan UMKM.", Content: "<p>Artikel UMKM.</p>", CoverURL: "https://placehold.co/800x450/059669/ffffff?text=UMKM", Published: true, CreatedAt: time.Now().Add(-5 * 24 * time.Hour), UpdatedAt: time.Now().Add(-5 * 24 * time.Hour)},
	}
	for _, a := range articles {
		if err := db.CreateArticle(a); err != nil {
			log.Printf("[seed] article %s: %v", a.Slug, err)
		}
	}

	programs := []db.Program{
		{PeriodLabel: "25.26", Title: "Sekolah Riset", Description: "Program peningkatan metodologi riset.", Order: 1},
		{PeriodLabel: "25.26", Title: "Forum Kebijakan", Description: "Diskusi kebijakan ekonomi strategis.", Order: 2},
	}
	for _, p := range programs {
		pp := p
		if err := db.InsertProgram(&pp); err != nil {
			log.Printf("[seed] program %s: %v", p.Title, err)
		}
	}

	faqs := []db.FAQ{
		{PeriodLabel: "25.26", Question: "Apa itu PKSE UGM?", Answer: "PKSE UGM adalah organisasi kajian ekonomi mahasiswa di UGM.", Order: 1},
		{PeriodLabel: "25.26", Question: "Bagaimana cara mendaftar beasiswa KSE?", Answer: "Pantau pengumuman resmi dan isi formulir saat pendaftaran dibuka.", Order: 2},
		{PeriodLabel: "GLOBAL", Question: "Apakah kegiatan PKSE hanya untuk mahasiswa ekonomi?", Answer: "Mayoritas program berbasis ekonomi, namun beberapa agenda terbuka lintas disiplin.", Order: 1},
	}
	for _, f := range faqs {
		ff := f
		if err := db.InsertFAQ(&ff); err != nil {
			log.Printf("[seed] faq %s: %v", f.Question, err)
		}
	}

	templates := []db.StatData{
		{PeriodLabel: "_TEMPLATE_", Label: "Total Anggota", Desc: "Jumlah anggota aktif", ChartType: "kpi", Fillable: true, Visible: true, Order: 1},
		{PeriodLabel: "_TEMPLATE_", Label: "Komposisi Program Studi", Desc: "Distribusi bidang studi", ChartType: "pie", Fillable: true, Visible: true, Order: 2},
	}
	templateID := map[string]string{}
	for _, s := range templates {
		ss := s
		if err := db.InsertStat(&ss); err != nil {
			log.Printf("[seed] stat template %s: %v", s.Label, err)
			continue
		}
		templateID[s.Label] = ss.ID.Hex()
	}

	if tid := templateID["Total Anggota"]; tid != "" {
		_ = db.UpsertPeriodStatValue("25.26", tid, "42")
	}
	if tid := templateID["Komposisi Program Studi"]; tid != "" {
		_ = db.UpsertPeriodStatValue("25.26", tid, "Ilmu Ekonomi:18, Manajemen:14, Akuntansi:10")
	}

	testShortLinks := []db.ShortLink{
		{Code: "faq", TargetURL: "https://example.com/faq", Label: "Contoh FAQ", CreatedBy: "superadmin"},
		{Code: "daftar", TargetURL: "https://example.com/daftar", Label: "Contoh Pendaftaran", CreatedBy: "superadmin"},
	}
	for _, sl := range testShortLinks {
		s := sl
		if err := db.InsertShortLink(&s); err != nil {
			log.Printf("[seed] shortlink %s: %v", s.Code, err)
		}
	}

	log.Println("[seed] done - credentials default: superadmin/admin123, admin2526/admin123, admin2425/admin123")
}
