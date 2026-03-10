package seed

import (
"log"
"time"

"webapp/internal/auth"
"webapp/internal/db"
)

func Run() {
log.Println("[seed] checking if seeding needed...")
count, err := db.CountUsers()
if err != nil || count > 0 {
return
}
log.Println("[seed] seeding initial data ...")

// ── Global Setting ────────────────────────────────────────────────────────
if err := db.UpsertGlobalSetting(db.GlobalSetting{
OrgName:   "PKSE UGM",
LogoURL:   "https://placehold.co/200x80/1a3a6b/ffffff?text=PKSE+UGM",
AboutHTML: `<p>Pusat Kajian dan Studi Ekonomi Universitas Gadjah Mada (PKSE UGM) adalah organisasi mahasiswa yang bergerak di bidang kajian, riset, dan pengembangan ilmu ekonomi di lingkungan UGM. Didirikan dengan semangat intelektual yang tinggi, PKSE UGM menjadi wadah bagi mahasiswa untuk mengembangkan kapasitas analisis ekonomi, berdiskusi isu-isu terkini, serta berkontribusi bagi masyarakat luas.</p>`,
SocialMedia: db.SocialMedia{
Instagram: "https://instagram.com/pkseugm",
Twitter:   "https://twitter.com/pkseugm",
YouTube:   "https://youtube.com/@pkseugm",
LinkedIn:  "https://linkedin.com/company/pkseugm",
},
}); err != nil {
log.Printf("[seed] global setting: %v", err)
}

// ── Users ──────────────────────────────────────────────────────────────────
hashAdmin, _ := auth.HashPassword("admin123")
users := []db.User{
{ID: "superadmin", Username: "superadmin", PasswordHash: hashAdmin, Role: "superadmin", CreatedAt: time.Now()},
{ID: "admin2526", Username: "admin2526", PasswordHash: hashAdmin, Role: "admin", AssignedPeriod: "25.26", CreatedAt: time.Now()},
{ID: "admin2425", Username: "admin2425", PasswordHash: hashAdmin, Role: "admin", AssignedPeriod: "24.25", CreatedAt: time.Now()},
}
for _, u := range users {
if err := db.CreateUser(u); err != nil {
log.Printf("[seed] user %s: %v", u.Username, err)
}
}

// ── Periods ────────────────────────────────────────────────────────────────
periods := []db.Period{
{Label: "24.25", DisplayName: "Kepengurusan 2024/2025", IsActive: false, HierarchyImageURL: "https://placehold.co/900x500/2563eb/ffffff?text=Struktur+Organisasi+2024/2025", CreatedAt: time.Now().Add(-365 * 24 * time.Hour)},
{Label: "25.26", DisplayName: "Kepengurusan 2025/2026", IsActive: true, HierarchyImageURL: "https://placehold.co/900x500/1e40af/ffffff?text=Struktur+Organisasi+2025/2026", CreatedAt: time.Now()},
}
for _, p := range periods {
if err := db.CreatePeriod(p); err != nil {
log.Printf("[seed] period %s: %v", p.Label, err)
}
}

// ── Period Abouts ──────────────────────────────────────────────────────────
aboutData := []db.PeriodAbout{
{
PeriodLabel: "24.25",
Sejarah:     "Periode kepengurusan 2024/2025 PKSE UGM merupakan periode yang penuh dengan semangat inovasi dan kolaborasi antar mahasiswa ekonomi. Selama periode ini, PKSE UGM berhasil menyelenggarakan berbagai kegiatan bergengsi termasuk seminar nasional dan kompetisi karya tulis ilmiah.",
Visi:        "Menjadi organisasi mahasiswa ekonomi yang unggul, inovatif, dan berkontribusi nyata bagi kemajuan ilmu ekonomi Indonesia.",
Misi:        "1. Mengembangkan kapasitas intelektual anggota melalui kajian mendalam.\n2. Membangun sinergi dengan akademisi, praktisi, dan masyarakat.\n3. Menjadi referensi kajian ekonomi terpercaya.",
},
{
PeriodLabel: "25.26",
Sejarah:     "Periode kepengurusan 2025/2026 PKSE UGM hadir dengan tema 'Ekonomi Berdaya, Indonesia Maju'. Periode ini berfokus pada penguatan kapasitas riset, pengembangan publikasi, dan perluasan jaringan dengan institusi ekonomi terkemuka di Indonesia dan Asia.",
Visi:        "Menjadi pusat kajian ekonomi mahasiswa yang diakui di tingkat nasional dengan kontribusi nyata pada kebijakan ekonomi Indonesia.",
Misi:        "1. Meningkatkan kualitas dan kuantitas produk kajian ekonomi.\n2. Memperluas jejaring dengan lembaga ekonomi nasional dan internasional.\n3. Memberdayakan anggota untuk menjadi pemimpin ekonomi masa depan.",
},
}
for _, pa := range aboutData {
if err := db.UpsertPeriodAbout(pa); err != nil {
log.Printf("[seed] period about %s: %v", pa.PeriodLabel, err)
}
}

// ── Departments ────────────────────────────────────────────────────────────
depts24 := []db.Department{
{PeriodLabel: "24.25", Name: "Badan Pengurus Harian", Description: "Koordinasi operasional organisasi", SortOrder: 1},
{PeriodLabel: "24.25", Name: "Departemen Kajian & Riset", Description: "Melakukan kajian dan penelitian ekonomi", SortOrder: 2},
{PeriodLabel: "24.25", Name: "Departemen Pendidikan", Description: "Program edukasi dan pelatihan anggota", SortOrder: 3},
{PeriodLabel: "24.25", Name: "Departemen Hubungan Eksternal", Description: "Menjalin kerjasama dengan pihak eksternal", SortOrder: 4},
}
depts25 := []db.Department{
{PeriodLabel: "25.26", Name: "Badan Pengurus Harian", Description: "Koordinasi dan manajemen organisasi", SortOrder: 1},
{PeriodLabel: "25.26", Name: "Departemen Riset & Kebijakan", Description: "Kajian mendalam isu ekonomi dan rekomendasi kebijakan", SortOrder: 2},
{PeriodLabel: "25.26", Name: "Departemen Pengembangan SDM", Description: "Peningkatan kapasitas anggota dan kaderisasi", SortOrder: 3},
{PeriodLabel: "25.26", Name: "Departemen Media & Komunikasi", Description: "Pengelolaan publikasi dan citra organisasi", SortOrder: 4},
{PeriodLabel: "25.26", Name: "Departemen Kemitraan", Description: "Sinergi dengan lembaga dan organisasi mitra", SortOrder: 5},
}
for _, d := range append(depts24, depts25...) {
if err := db.CreateDepartment(d); err != nil {
log.Printf("[seed] dept %s: %v", d.Name, err)
}
}

// ── Members ────────────────────────────────────────────────────────────────
members24 := []db.Member{
{PeriodLabel: "24.25", FullName: "Andi Setiawan Rahardjo", Nickname: "Andi", PhotoURL: "https://i.pravatar.cc/200?img=1", Department: "Badan Pengurus Harian", Position: "Ketua Umum", SortOrder: 1},
{PeriodLabel: "24.25", FullName: "Berliana Kusuma Dewi", Nickname: "Berliana", PhotoURL: "https://i.pravatar.cc/200?img=2", Department: "Badan Pengurus Harian", Position: "Sekretaris Jenderal", SortOrder: 2},
{PeriodLabel: "24.25", FullName: "Cahyo Nugroho Putra", Nickname: "Cahyo", PhotoURL: "https://i.pravatar.cc/200?img=3", Department: "Badan Pengurus Harian", Position: "Bendahara Umum", SortOrder: 3},
{PeriodLabel: "24.25", FullName: "Destiana Ayu Pratiwi", Nickname: "Desti", PhotoURL: "https://i.pravatar.cc/200?img=4", Department: "Departemen Kajian & Riset", Position: "Kepala Departemen", SortOrder: 4},
{PeriodLabel: "24.25", FullName: "Eko Firmansyah", Nickname: "Eko", PhotoURL: "https://i.pravatar.cc/200?img=5", Department: "Departemen Kajian & Riset", Position: "Wakil Kepala", SortOrder: 5},
{PeriodLabel: "24.25", FullName: "Fitri Handayani Sari", Nickname: "Fitri", PhotoURL: "https://i.pravatar.cc/200?img=6", Department: "Departemen Pendidikan", Position: "Kepala Departemen", SortOrder: 6},
}
members25 := []db.Member{
{PeriodLabel: "25.26", FullName: "Galang Prasetyo Wibowo", Nickname: "Galang", PhotoURL: "https://i.pravatar.cc/200?img=7", Department: "Badan Pengurus Harian", Position: "Ketua Umum", SortOrder: 1},
{PeriodLabel: "25.26", FullName: "Hana Maharani Putri", Nickname: "Hana", PhotoURL: "https://i.pravatar.cc/200?img=8", Department: "Badan Pengurus Harian", Position: "Wakil Ketua", SortOrder: 2},
{PeriodLabel: "25.26", FullName: "Ilham Badrussalam", Nickname: "Ilham", PhotoURL: "https://i.pravatar.cc/200?img=9", Department: "Badan Pengurus Harian", Position: "Sekretaris Jenderal", SortOrder: 3},
{PeriodLabel: "25.26", FullName: "Juwita Permata Sari", Nickname: "Juwita", PhotoURL: "https://i.pravatar.cc/200?img=10", Department: "Badan Pengurus Harian", Position: "Bendahara Umum", SortOrder: 4},
{PeriodLabel: "25.26", FullName: "Kevin Ardiansyah", Nickname: "Kevin", PhotoURL: "https://i.pravatar.cc/200?img=11", Department: "Departemen Riset & Kebijakan", Position: "Kepala Departemen", SortOrder: 5},
{PeriodLabel: "25.26", FullName: "Laila Nurfitriani", Nickname: "Laila", PhotoURL: "https://i.pravatar.cc/200?img=12", Department: "Departemen Riset & Kebijakan", Position: "Wakil Kepala", SortOrder: 6},
{PeriodLabel: "25.26", FullName: "Muhammad Fadhil Akbar", Nickname: "Fadhil", PhotoURL: "https://i.pravatar.cc/200?img=13", Department: "Departemen Pengembangan SDM", Position: "Kepala Departemen", SortOrder: 7},
{PeriodLabel: "25.26", FullName: "Nadia Rahmawati Isnaini", Nickname: "Nadia", PhotoURL: "https://i.pravatar.cc/200?img=14", Department: "Departemen Pengembangan SDM", Position: "Wakil Kepala", SortOrder: 8},
{PeriodLabel: "25.26", FullName: "Okta Firmansyah Putra", Nickname: "Okta", PhotoURL: "https://i.pravatar.cc/200?img=15", Department: "Departemen Media & Komunikasi", Position: "Kepala Departemen", SortOrder: 9},
{PeriodLabel: "25.26", FullName: "Putri Anggraeni Sari", Nickname: "Putri", PhotoURL: "https://i.pravatar.cc/200?img=16", Department: "Departemen Kemitraan", Position: "Kepala Departemen", SortOrder: 10},
}
for _, m := range append(members24, members25...) {
if err := db.CreateMember(m); err != nil {
log.Printf("[seed] member %s: %v", m.FullName, err)
}
}

// ── Announcements ──────────────────────────────────────────────────────────
announcements := []db.Announcement{
{PeriodLabel: "25.26", Title: "Open Recruitment Anggota Baru PKSE UGM 2025/2026", Content: "PKSE UGM membuka pendaftaran anggota baru untuk periode 2025/2026. Bergabunglah dan jadilah bagian dari komunitas mahasiswa ekonomi terbaik di UGM! Pendaftaran dibuka mulai 1 Oktober hingga 31 Oktober 2025.", Published: true, CreatedAt: time.Now().Add(-30 * 24 * time.Hour)},
{PeriodLabel: "25.26", Title: "Seminar Nasional Ekonomi Digital 2025", Content: "PKSE UGM dengan bangga mempersembahkan Seminar Nasional Ekonomi Digital 2025 dengan tema 'Transformasi Ekonomi di Era Kecerdasan Buatan'. Acara akan dilaksanakan pada 15 November 2025 di Auditorium Pascasarjana UGM.", Published: true, CreatedAt: time.Now().Add(-15 * 24 * time.Hour)},
{PeriodLabel: "25.26", Title: "Kompetisi Karya Tulis Ilmiah Ekonomi Nasional 2025", Content: "Ayo tunjukkan kemampuan riset dan analisamu! PKSE UGM menyelenggarakan Kompetisi Karya Tulis Ilmiah Ekonomi tingkat nasional dengan total hadiah Rp 15.000.000. Pendaftaran sampai 30 November 2025.", Published: true, CreatedAt: time.Now().Add(-7 * 24 * time.Hour)},
{PeriodLabel: "24.25", Title: "Pelantikan Pengurus PKSE UGM 2024/2025", Content: "Pengurus periode 2024/2025 resmi dilantik dalam upacara khidmat di Ruang Sidang Utama Gedung Fisipol UGM. Selamat kepada seluruh pengurus terpilih!", Published: true, CreatedAt: time.Now().Add(-400 * 24 * time.Hour)},
{PeriodLabel: "24.25", Title: "Forum Mahasiswa Ekonomi UGM 2024", Content: "Forum Mahasiswa Ekonomi UGM 2024 berhasil terselenggara dengan sukses dihadiri lebih dari 500 peserta dari berbagai universitas di Indonesia.", Published: true, CreatedAt: time.Now().Add(-380 * 24 * time.Hour)},
}
for _, a := range announcements {
if err := db.CreateAnnouncement(a); err != nil {
log.Printf("[seed] announcement: %v", err)
}
}

// ── Articles ───────────────────────────────────────────────────────────────
articles := []db.Article{
{
PeriodLabel: "25.26",
Title:       "Dampak Kecerdasan Buatan terhadap Pasar Tenaga Kerja Indonesia",
Slug:        "dampak-ai-pasar-kerja-indonesia",
Excerpt:     "Analisis mendalam mengenai bagaimana perkembangan AI mempengaruhi struktur pasar tenaga kerja di Indonesia dan implikasinya bagi kebijakan ketenagakerjaan nasional.",
Content:     "<p>Perkembangan kecerdasan buatan (AI) yang pesat membawa dampak transformatif bagi berbagai sektor ekonomi, termasuk pasar tenaga kerja Indonesia. Kajian ini menganalisis tren otomasi, pergeseran permintaan tenaga kerja, dan respons kebijakan yang diperlukan.</p><p>Berdasarkan data BPS 2024, sekitar 23 juta pekerjaan di Indonesia berisiko tergantikan oleh otomasi dalam 10 tahun ke depan. Namun, di sisi lain, AI juga menciptakan 15 juta pekerjaan baru di bidang teknologi dan layanan berbasis data.</p>",
CoverURL:    "https://placehold.co/800x450/1e40af/ffffff?text=AI+%26+Pasar+Kerja",
Published:   true,
CreatedAt:   time.Now().Add(-20 * 24 * time.Hour),
},
{
PeriodLabel: "25.26",
Title:       "Peran UMKM dalam Pemulihan Ekonomi Pasca Pandemi",
Slug:        "umkm-pemulihan-ekonomi-pasca-pandemi",
Excerpt:     "UMKM sebagai tulang punggung perekonomian Indonesia memainkan peran krusial dalam proses pemulihan ekonomi nasional.",
Content:     "<p>Usaha Mikro, Kecil, dan Menengah (UMKM) menyumbang lebih dari 60% PDB Indonesia dan menyerap 97% tenaga kerja nasional. Kajian ini mengulas strategi bertahan dan tumbuh UMKM dalam konteks pemulihan ekonomi pasca pandemi COVID-19.</p>",
CoverURL:    "https://placehold.co/800x450/059669/ffffff?text=UMKM+%26+Ekonomi",
Published:   true,
CreatedAt:   time.Now().Add(-10 * 24 * time.Hour),
},
{
PeriodLabel: "25.26",
Title:       "Analisis Kebijakan Fiskal Indonesia 2025: Tantangan dan Peluang",
Slug:        "kebijakan-fiskal-indonesia-2025",
Excerpt:     "Tinjauan kritis atas arah kebijakan fiskal Indonesia 2025 di tengah ketidakpastian ekonomi global.",
Content:     "<p>Kebijakan fiskal Indonesia 2025 menghadapi tantangan multidimensi: konsolidasi defisit anggaran, tekanan belanja infrastruktur, dan kebutuhan stimulus ekonomi. Artikel ini menganalisis trade-off dan pilihan kebijakan yang tersedia.</p>",
CoverURL:    "https://placehold.co/800x450/7c3aed/ffffff?text=Fiskal+2025",
Published:   true,
CreatedAt:   time.Now().Add(-5 * 24 * time.Hour),
},
{
PeriodLabel: "24.25",
Title:       "Dinamika Nilai Tukar Rupiah dan Implikasinya bagi Ekspor Nasional",
Slug:        "dinamika-nilai-tukar-rupiah-ekspor",
Excerpt:     "Kajian mendalam tentang fluktuasi nilai tukar Rupiah dan pengaruhnya terhadap daya saing ekspor Indonesia di pasar global.",
Content:     "<p>Nilai tukar merupakan salah satu variabel makroekonomi terpenting yang mempengaruhi kinerja ekspor suatu negara. Artikel ini menganalisis pola fluktuasi Rupiah sepanjang 2024 dan dampaknya terhadap berbagai komoditas ekspor utama Indonesia.</p>",
CoverURL:    "https://placehold.co/800x450/dc2626/ffffff?text=Nilai+Tukar+Rupiah",
Published:   true,
CreatedAt:   time.Now().Add(-380 * 24 * time.Hour),
},
}
for _, a := range articles {
a.UpdatedAt = a.CreatedAt
if err := db.CreateArticle(a); err != nil {
log.Printf("[seed] article %s: %v", a.Slug, err)
}
}

log.Println("[seed] done - credentials: superadmin/admin123, admin2526/admin123, admin2425/admin123")
}
