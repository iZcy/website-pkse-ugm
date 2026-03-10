package seed

import (
"fmt"
"time"

"webapp/internal/auth"
"webapp/internal/db"
)

func Run() {
n, err := db.CountUsers()
if err != nil || n > 0 {
return
}
fmt.Println("[seed] seeding initial data ...")

superHash, _ := auth.HashPassword("admin123")
adminHash, _ := auth.HashPassword("admin123")
_ = db.CreateUser(db.User{Username: "superadmin", PasswordHash: superHash, Role: "superadmin", CreatedAt: time.Now()})
_ = db.CreateUser(db.User{Username: "admin", PasswordHash: adminHash, Role: "admin", CreatedAt: time.Now()})

_ = db.CreatePeriod(db.Period{Label: "24.25", DisplayName: "2024/2025", IsActive: false, CreatedAt: time.Now()})
_ = db.CreatePeriod(db.Period{Label: "25.26", DisplayName: "2025/2026", IsActive: true, CreatedAt: time.Now()})

const pid = "25.26"

_ = db.UpsertSiteSetting(pid, map[string]any{
"period_id": pid,
"sejarah":   "Paguyuban Karya Salemba Empat (PKSE) UGM berdiri pada tahun 1994 sebagai wadah bagi mahasiswa penerima beasiswa Karya Salemba Empat di lingkungan Universitas Gadjah Mada.",
"visi":      "Menjadi paguyuban mahasiswa penerima beasiswa yang unggul, berdampak, dan berkarakter di tingkat nasional.",
"misi":      "Menumbuhkan semangat belajar dan berprestasi, mempererat tali silaturahmi antar anggota, serta berkontribusi nyata bagi masyarakat.",
})

depts := []db.Department{
{PeriodID: pid, Name: "Departemen Akademik dan Riset", Description: "Mendorong prestasi akademis dan budaya riset melalui pelatihan, seminar, dan lomba karya ilmiah.", SortOrder: 1},
{PeriodID: pid, Name: "Departemen Sosial dan Pengabdian Masyarakat", Description: "Merancang dan melaksanakan program pengabdian masyarakat seperti bakti sosial, mengajar, dan donasi.", SortOrder: 2},
{PeriodID: pid, Name: "Departemen Minat dan Bakat", Description: "Memfasilitasi pengembangan soft-skill dan bakat anggota melalui olahraga, seni, dan kompetisi.", SortOrder: 3},
{PeriodID: pid, Name: "Departemen Hubungan Luar", Description: "Membangun jaringan dengan institusi, alumni, dan paguyuban KSE di perguruan tinggi lain.", SortOrder: 4},
}
for _, d := range depts {
_ = db.CreateDepartment(d)
}

officers := []db.Officer{
{PeriodID: pid, Name: "Rizki Aditya Pratama", Role: "Ketua Umum", Department: "Inti", Tier: "inti", SortOrder: 1},
{PeriodID: pid, Name: "Siti Nuraini Rahayu", Role: "Sekretaris Umum", Department: "Inti", Tier: "inti", SortOrder: 2},
{PeriodID: pid, Name: "Bagas Eko Nugroho", Role: "Bendahara Umum", Department: "Inti", Tier: "inti", SortOrder: 3},
{PeriodID: pid, Name: "Aulia Fitri Handayani", Role: "Kepala Departemen", Department: "Akademik dan Riset", Tier: "departemen", SortOrder: 4},
{PeriodID: pid, Name: "Muhammad Fajar Sidiq", Role: "Kepala Departemen", Department: "Sosial dan Pengabdian Masyarakat", Tier: "departemen", SortOrder: 5},
{PeriodID: pid, Name: "Dewi Kartika Sari", Role: "Kepala Departemen", Department: "Minat dan Bakat", Tier: "departemen", SortOrder: 6},
{PeriodID: pid, Name: "Hendri Kurniawan", Role: "Kepala Departemen", Department: "Hubungan Luar", Tier: "departemen", SortOrder: 7},
{PeriodID: pid, Name: "Yuliana Pratiwi", Role: "Staf", Department: "Akademik dan Riset", Tier: "departemen", SortOrder: 8},
}
for _, o := range officers {
_ = db.CreateOfficer(o)
}

announcements := []db.Announcement{
{PeriodID: pid, Title: "Pendaftaran Anggota Baru Periode 25.26 Dibuka!", Content: "Kami mengumumkan pendaftaran anggota baru PKSE UGM untuk periode 2025/2026 kini resmi dibuka. Segera daftarkan diri Anda sebelum 31 Agustus 2025.", Published: true, CreatedAt: time.Now().AddDate(0, 0, -30)},
{PeriodID: pid, Title: "Bakti Sosial PKSE UGM di Desa Wonokerto", Content: "PKSE UGM mengadakan kegiatan bakti sosial di Desa Wonokerto, Sleman pada 15 September 2025. Meliputi penyuluhan kesehatan, pengajaran anak-anak, dan pembagian sembako.", Published: true, CreatedAt: time.Now().AddDate(0, 0, -14)},
{PeriodID: pid, Title: "Webinar Nasional: Tips Lolos Beasiswa KSE", Content: "Jangan lewatkan webinar nasional bersama alumni terbaik KSE pada 10 Oktober 2025 pukul 19.00 WIB secara daring.", Published: true, CreatedAt: time.Now().AddDate(0, 0, -7)},
{PeriodID: pid, Title: "Rapat Koordinasi Internal Periode 25.26", Content: "Agenda rapat koordinasi internal untuk menyusun program kerja semester genap. Jadwal akan dikonfirmasi kemudian.", Published: false, CreatedAt: time.Now().AddDate(0, 0, -2)},
{PeriodID: pid, Title: "Lomba Karya Tulis Ilmiah Antar Anggota", Content: "PKSE UGM akan menyelenggarakan LKTI internal untuk melatih kemampuan menulis ilmiah anggota. Detail masih dalam penyusunan.", Published: false, CreatedAt: time.Now()},
}
for _, a := range announcements {
_ = db.CreateAnnouncement(a)
}

articles := []db.Article{
{PeriodID: pid, Title: "Kisah Inspiratif: Dari Beasiswa KSE Menuju Karir Impian", Slug: "kisah-inspiratif-beasiswa-kse", Excerpt: "Bagaimana beasiswa Karya Salemba Empat mengubah hidup mahasiswa dari daerah terpencil.", Content: "<p>Setiap tahun Yayasan KSE memberikan kesempatan bagi ratusan mahasiswa berprestasi. Rizki Aditya Pratama, mahasiswa Matematika UGM 2021, adalah salah satunya. Berasal dari Kupang, ia kini menjabat Ketua Umum PKSE UGM.</p>", CoverURL: "", Published: true, CreatedAt: time.Now().AddDate(0, 0, -21), UpdatedAt: time.Now().AddDate(0, 0, -21)},
{PeriodID: pid, Title: "5 Tips Manajemen Waktu untuk Mahasiswa Penerima Beasiswa", Slug: "5-tips-manajemen-waktu-mahasiswa-beasiswa", Excerpt: "Lima tips dari anggota PKSE UGM untuk mengelola waktu antara akademis, organisasi, dan sosial.", Content: "<p>Manajemen waktu adalah kunci. Tips: jadwal mingguan, teknik Pomodoro, batasi media sosial, delegasi tugas, jaga kesehatan.</p>", CoverURL: "", Published: true, CreatedAt: time.Now().AddDate(0, 0, -10), UpdatedAt: time.Now().AddDate(0, 0, -10)},
{PeriodID: pid, Title: "Program Pengabdian Masyarakat PKSE UGM 2025", Slug: "program-pengabdian-masyarakat-2025", Excerpt: "Rencana program pengabdian masyarakat PKSE UGM 2025.", Content: "<p>Artikel ini masih dalam tahap penyusunan.</p>", CoverURL: "", Published: false, CreatedAt: time.Now().AddDate(0, 0, -3), UpdatedAt: time.Now().AddDate(0, 0, -3)},
}
for _, a := range articles {
_ = db.CreateArticle(a)
}

fmt.Println("[seed] done")
}
