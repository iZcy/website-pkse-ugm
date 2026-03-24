package seed

import (
	"log"
	"os"
	"strings"
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
	resetRequested := strings.EqualFold(os.Getenv("SEED_RESET"), "1") || strings.EqualFold(os.Getenv("SEED_RESET"), "true") || strings.EqualFold(os.Getenv("SEED_RESET"), "yes")

	periodCount, err := db.CountPeriods()
	if err == nil && periodCount > 0 && !resetRequested {
		return
	}

	if resetRequested {
		log.Println("[seed] SEED_RESET enabled, clearing seeded collections...")
		err = db.ResetCollections(
			"global_setting",
			"periods",
			"period_abouts",
			"departments",
			"members",
			"announcements",
			"articles",
			"programs",
			"faqs",
			"stats",
			"shortlinks",
		)
		if err != nil {
			log.Printf("[seed] reset collections failed: %v", err)
		}
	}

	log.Println("[seed] seeding initial data ...")

	ensureUser("superadmin", "superadmin", "")
	ensureUser("admin2526", "admin", "25.26")
	ensureUser("admin2425", "admin", "24.25")

	if err := db.UpsertGlobalSetting(db.GlobalSetting{
		OrgName:   "PKSE UGM",
		LogoURL:   "https://placehold.co/200x80/1a3a6b/ffffff?text=PKSE+UGM",
		AboutHTML: `<p>PKSE UGM adalah organisasi mahasiswa ekonomi yang berfokus pada kajian, riset, dan pengembangan kapasitas intelektual.</p>`,
		SocialMedia: db.SocialMedia{
			Instagram: "https://instagram.com/pkseugm",
			Twitter:   "https://x.com/pkseugm",
			Facebook:  "https://facebook.com/pkseugm",
			YouTube:   "https://youtube.com/@pkseugm",
			TikTok:    "https://tiktok.com/@pkseugm",
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
			PeriodLabel:        "24.25",
			TaglineTitle:       "Bertumbuh Bersama",
			TaglineSubtitle:    "Solid, Adaptif, Kolaboratif",
			TaglineDescription: "Kami membangun budaya belajar dan kontribusi bersama untuk dampak yang berkelanjutan.",
			Sejarah:            "Periode 24/25 menekankan penguatan budaya riset internal.",
			Visi:               "Menjadi organisasi ekonomi mahasiswa yang unggul dan berdampak.",
			Misi:               "Meningkatkan kualitas kajian, kaderisasi, dan kolaborasi eksternal.",
			HierarchyImageURL:  "https://placehold.co/900x500/2563eb/ffffff?text=Struktur+24/25",
			CoverImageURL:      "https://placehold.co/1400x700/1d4ed8/ffffff?text=Cover+Periode+24/25",
			Gallery: []db.GalleryItem{
				{Title: "Rapat Kerja", ImageURL: "https://placehold.co/900x600/2563eb/ffffff?text=Raker+24/25", Caption: "Penyusunan target dan KPI periodik.", Order: 1},
				{Title: "Diskusi Publik", ImageURL: "https://placehold.co/900x600/1e40af/ffffff?text=Diskusi+Publik+24/25", Caption: "Forum kajian lintas fakultas.", Order: 2},
			},
		},
		{
			PeriodLabel:        "25.26",
			TaglineTitle:       "Kawah Candradimuka",
			TaglineSubtitle:    "Pemimpin Masa Depan",
			TaglineDescription: "Mengasah daya pikir, empati sosial, dan kepemimpinan yang berintegritas.",
			Sejarah:            "Periode 25/26 berfokus pada ekspansi publikasi dan kemitraan.",
			Visi:               "Menjadi pusat kajian ekonomi mahasiswa yang kredibel secara nasional.",
			Misi:               "Memperluas jejaring, meningkatkan kualitas produk analisis, dan pengembangan SDM.",
			HierarchyImageURL:  "https://placehold.co/900x500/1e40af/ffffff?text=Struktur+25/26",
			CoverImageURL:      "https://placehold.co/1400x700/1e3a8a/ffffff?text=Cover+Periode+25/26",
			Gallery: []db.GalleryItem{
				{Title: "Bootcamp Riset", ImageURL: "https://placehold.co/900x600/1d4ed8/ffffff?text=Bootcamp+Riset+25/26", Caption: "Penguatan metodologi dan penulisan policy brief.", Order: 1},
				{Title: "Kunjungan Mitra", ImageURL: "https://placehold.co/900x600/0f766e/ffffff?text=Kunjungan+Mitra+25/26", Caption: "Kolaborasi program dengan mitra eksternal.", Order: 2},
				{Title: "Seminar Nasional", ImageURL: "https://placehold.co/900x600/7c3aed/ffffff?text=Seminar+Nasional+25/26", Caption: "Forum sharing kebijakan ekonomi terkini.", Order: 3},
			},
		},
	}
	for _, pa := range aboutData {
		if err := db.UpsertPeriodAbout(pa); err != nil {
			log.Printf("[seed] period about %s: %v", pa.PeriodLabel, err)
		}
	}

	depts := []db.Department{
		{PeriodLabel: "24.25", Name: "Badan Pengurus Harian", Description: "Koordinasi organisasi", IconURL: "https://placehold.co/96x96/1d4ed8/ffffff?text=BPH", SortOrder: 1},
		{PeriodLabel: "24.25", Name: "Departemen Kajian & Riset", Description: "Kajian isu ekonomi", IconURL: "https://placehold.co/96x96/2563eb/ffffff?text=Riset", SortOrder: 2},
		{PeriodLabel: "25.26", Name: "Badan Pengurus Harian", Description: "Koordinasi organisasi", IconURL: "https://placehold.co/96x96/1e40af/ffffff?text=BPH", SortOrder: 1},
		{PeriodLabel: "25.26", Name: "Departemen Riset & Kebijakan", Description: "Riset dan kebijakan", IconURL: "https://placehold.co/96x96/3b82f6/ffffff?text=Kebijakan", SortOrder: 2},
		{PeriodLabel: "25.26", Name: "Departemen Pengembangan SDM", Description: "Kaderisasi dan pengembangan", IconURL: "https://placehold.co/96x96/0ea5e9/ffffff?text=SDM", SortOrder: 3},
	}
	for _, d := range depts {
		if err := db.CreateDepartment(d); err != nil {
			log.Printf("[seed] dept %s: %v", d.Name, err)
		}
	}

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
			CoverURL:      "https://placehold.co/1200x600/1d4ed8/ffffff?text=Andi",
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
			CoverURL:      "https://placehold.co/1200x600/1e40af/ffffff?text=Hana",
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
			CoverURL:      "https://placehold.co/1200x600/2563eb/ffffff?text=Fadhil",
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
		{PeriodLabel: "25.26", Title: "Open Recruitment Anggota Baru", Content: "Pendaftaran dibuka 1-31 Oktober.", ImageURL: "https://placehold.co/1200x630/1e40af/ffffff?text=Open+Recruitment", Published: true, CreatedAt: time.Now().Add(-7 * 24 * time.Hour), UpdatedAt: time.Now().Add(-7 * 24 * time.Hour)},
		{PeriodLabel: "25.26", Title: "Seminar Nasional Ekonomi", Content: "Seminar nasional akan digelar bulan depan.", ImageURL: "https://placehold.co/1200x630/0f766e/ffffff?text=Seminar+Nasional", Published: true, CreatedAt: time.Now().Add(-3 * 24 * time.Hour), UpdatedAt: time.Now().Add(-3 * 24 * time.Hour)},
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
		{PeriodLabel: "25.26", Department: "Departemen Riset & Kebijakan", Title: "Sekolah Riset", Description: "Program peningkatan metodologi riset.", ImageURL: "https://placehold.co/1200x700/1d4ed8/ffffff?text=Sekolah+Riset", Order: 1},
		{PeriodLabel: "25.26", Department: "Departemen Riset & Kebijakan", Title: "Forum Kebijakan", Description: "Diskusi kebijakan ekonomi strategis.", ImageURL: "https://placehold.co/1200x700/2563eb/ffffff?text=Forum+Kebijakan", Order: 2},
		{PeriodLabel: "25.26", Department: "Departemen Pengembangan SDM", Title: "Mentoring KSE", Description: "Pendampingan akademik dan pengembangan karier anggota.", ImageURL: "https://placehold.co/1200x700/0ea5e9/ffffff?text=Mentoring+KSE", Order: 3},
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
		{PeriodLabel: "_TEMPLATE_", Label: "Pertumbuhan Anggota", Desc: "Tren pertumbuhan per bulan", ChartType: "line", Fillable: true, Visible: true, Order: 3},
		{PeriodLabel: "_TEMPLATE_", Label: "Partisipasi Program", Desc: "Partisipasi kegiatan", ChartType: "bar", Fillable: true, Visible: true, Order: 4},
		{PeriodLabel: "_TEMPLATE_", Label: "Skor Kompetensi", Desc: "Penilaian kompetensi", ChartType: "radar", Fillable: true, Visible: true, Order: 5},
		{PeriodLabel: "_TEMPLATE_", Label: "Sebaran Prestasi", Desc: "Persebaran capaian", ChartType: "scatter", Fillable: true, Visible: true, Order: 6},
		{PeriodLabel: "_TEMPLATE_", Label: "Prioritas Kegiatan", Desc: "Bobot prioritas", ChartType: "bubble", Fillable: true, Visible: true, Order: 7},
		{PeriodLabel: "_TEMPLATE_", Label: "Polar Aktivitas", Desc: "Distribusi polar", ChartType: "polar", Fillable: true, Visible: true, Order: 8},
		{PeriodLabel: "_TEMPLATE_", Label: "Distribusi Skor", Desc: "Distribusi rentang nilai", ChartType: "histogram", Fillable: true, Visible: true, Order: 9},
		{PeriodLabel: "_TEMPLATE_", Label: "Kontribusi Divisi", Desc: "Stacked kontribusi", ChartType: "stacked_bar", Fillable: true, Visible: true, Order: 10},
		{PeriodLabel: "_TEMPLATE_", Label: "Kinerja Tim", Desc: "Perbandingan tim", ChartType: "grouped_bar", Fillable: true, Visible: true, Order: 11},
		{PeriodLabel: "_TEMPLATE_", Label: "Konversi Rekrutmen", Desc: "Funnel pendaftar", ChartType: "funnel", Fillable: true, Visible: true, Order: 12},
		{PeriodLabel: "_TEMPLATE_", Label: "Peta Aktivitas", Desc: "Heatmap agenda", ChartType: "heatmap", Fillable: true, Visible: true, Order: 13},
		{PeriodLabel: "_TEMPLATE_", Label: "Ringkasan KPI", Desc: "KPI card", ChartType: "kpi", Fillable: true, Visible: true, Order: 14},
		{PeriodLabel: "_TEMPLATE_", Label: "Tabel Capaian", Desc: "Data tabular", ChartType: "table", Fillable: true, Visible: true, Order: 15},
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

	statValues := map[string]string{
		"Total Anggota":           `42`,
		"Komposisi Program Studi": `[{"label":"Ilmu Ekonomi","value":18},{"label":"Manajemen","value":14},{"label":"Akuntansi","value":10}]`,
		"Pertumbuhan Anggota":     `[{"label":"Jan","value":15},{"label":"Feb","value":21},{"label":"Mar","value":28},{"label":"Apr","value":34}]`,
		"Partisipasi Program":     `[{"label":"Mentoring","value":34},{"label":"Webinar","value":29},{"label":"Riset","value":22}]`,
		"Skor Kompetensi":         `[{"label":"Analisis","value":82},{"label":"Public Speaking","value":75},{"label":"Teamwork","value":88},{"label":"Leadership","value":80}]`,
		"Sebaran Prestasi":        `[{"x":1,"y":22},{"x":2,"y":28},{"x":3,"y":26},{"x":4,"y":35},{"x":5,"y":40}]`,
		"Prioritas Kegiatan":      `[{"x":1,"y":5,"r":10},{"x":2,"y":8,"r":14},{"x":3,"y":6,"r":12}]`,
		"Polar Aktivitas":         `[{"label":"Akademik","value":30},{"label":"Sosial","value":20},{"label":"Riset","value":25},{"label":"Kepemimpinan","value":25}]`,
		"Distribusi Skor":         `[{"label":"60-69","value":4},{"label":"70-79","value":10},{"label":"80-89","value":19},{"label":"90-100","value":9}]`,
		"Kontribusi Divisi":       `{"labels":["Q1","Q2","Q3"],"series":[{"name":"Riset","values":[8,9,10]},{"name":"SDM","values":[6,7,8]},{"name":"Humas","values":[4,5,6]}]}`,
		"Kinerja Tim":             `{"labels":["Tim A","Tim B","Tim C"],"series":[{"name":"Output","values":[12,10,14]},{"name":"Impact","values":[9,11,13]}]}`,
		"Konversi Rekrutmen":      `[{"label":"Pendaftar","value":220},{"label":"Seleksi Berkas","value":140},{"label":"Wawancara","value":76},{"label":"Diterima","value":42}]`,
		"Peta Aktivitas":          `[{"label":"Senin","value":4},{"label":"Selasa","value":7},{"label":"Rabu","value":5},{"label":"Kamis","value":9},{"label":"Jumat","value":6},{"label":"Sabtu","value":3}]`,
		"Ringkasan KPI":           `92%`,
		"Tabel Capaian":           `[{"Metric":"Artikel Terbit","Nilai":"24"},{"Metric":"Program Berjalan","Nilai":"12"},{"Metric":"Mitra Aktif","Nilai":"8"}]`,
	}
	for label, value := range statValues {
		if tid := templateID[label]; tid != "" {
			_ = db.UpsertPeriodStatValue("25.26", tid, value)
		}
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
