package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"text/template"
)

type Handler struct {
	db        *sql.DB
	templates *template.Template
}

func New(db *sql.DB) *Handler {
	tmpl := template.Must(template.ParseGlob("templates/*.html"))
	return &Handler{
		db:        db,
		templates: tmpl,
	}
}

func (h *Handler) Home(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	data := map[string]interface{}{
		"Title": "Beranda",
	}

	rows, err := h.db.Query("SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 5")
	if err == nil {
		defer rows.Close()
		var announcements []map[string]interface{}
		for rows.Next() {
			var id int
			var title, content string
			var createdAt string
			rows.Scan(&id, &title, &content, &createdAt)
			announcements = append(announcements, map[string]interface{}{
				"ID":        id,
				"Title":     title,
				"Content":   content,
				"CreatedAt": createdAt,
			})
		}
		data["Announcements"] = announcements
	}

	h.templates.ExecuteTemplate(w, "index.html", data)
}

func (h *Handler) About(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title": "Tentang Kami",
	}
	h.templates.ExecuteTemplate(w, "about.html", data)
}

func (h *Handler) Announcements(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title": "Pengumuman",
	}
	h.templates.ExecuteTemplate(w, "announcements.html", data)
}

func (h *Handler) Contact(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Title": "Hubungi Kami",
	}
	h.templates.ExecuteTemplate(w, "contact.html", data)
}

func (h *Handler) ProfileRani(w http.ResponseWriter, r *http.Request) {
	data := map[string]interface{}{
		"Name":     "Auliya Maharani Lazuardi",
		"Nickname": "Rani",
		"Role":     "Wakil Ketua KSE Scholarship Association",
		"Faculty":  "Fakultas Teknologi Pertanian",
		"ImageURL": "https://instagram.fcgk3-2.fna.fbcdn.net/v/t51.82787-15/572321913_18494163121072924_7573564493378854406_n.webp?_nc_cat=106&ig_cache_key=Mzc1MTk0MjgzMzUzNjMyNDU0Mg%3D%3D.3-ccb7-5&ccb=7-5&_nc_sid=58cdad&efg=eyJ2ZW5jb2RlX3RhZyI6InhwaWRzLjEwODB4MTM1MC5zZHIuQzMifQ%3D%3D&_nc_ohc=cnUl5s6Ice8Q7kNvwG51wgt&_nc_oc=AdnvfDFF3TRE_mleHdnpv5SEyLbYJabIdmz5D5NeVaI1HDUkuSL22ITToygV4mrM3zc&_nc_ad=z-m&_nc_cid=0&_nc_zt=23&_nc_ht=instagram.fcgk3-2.fna&_nc_gid=2ZiSBH7xU89c4gVKse4rqQ&oh=00_AftE16sPXODDH01qRoWiLdfwksdWnwVvkEf90lrI48naQg&oe=699E5E2D",
	}
	h.templates.ExecuteTemplate(w, "profile.html", data)
}

func (h *Handler) AnnouncementsAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := h.db.Query("SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC")
	if err != nil {
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id int
		var title, content, createdAt string
		rows.Scan(&id, &title, &content, &createdAt)
		results = append(results, map[string]interface{}{
			"id":         id,
			"title":      title,
			"content":    content,
			"created_at": createdAt,
		})
	}

	json.NewEncoder(w).Encode(results)
}
