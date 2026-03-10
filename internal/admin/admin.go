package admin

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"text/template"
	"time"
)

var (
	adminPassword string
	strapiURL     string
	strapiToken   string
	sessionSecret []byte
	tmpl          *template.Template
)

func Init() {
	adminPassword = os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123"
	}
	strapiURL = os.Getenv("STRAPI_URL")
	if strapiURL == "" {
		strapiURL = "http://strapi:1337"
	}
	strapiToken = os.Getenv("STRAPI_API_TOKEN")
	secret := os.Getenv("ADMIN_SESSION_SECRET")
	if secret == "" {
		secret = "changeme-secret"
	}
	sessionSecret = []byte(secret)
	tmpl = template.Must(template.ParseGlob("templates/admin-panel/*.html"))
}

// ── session helpers ───────────────────────────────────────────────────────────

func signSession(value string) string {
	mac := hmac.New(sha256.New, sessionSecret)
	mac.Write([]byte(value))
	return value + "." + hex.EncodeToString(mac.Sum(nil))
}

func verifySession(signed string) (string, bool) {
	parts := strings.LastIndex(signed, ".")
	if parts < 0 {
		return "", false
	}
	value, sig := signed[:parts], signed[parts+1:]
	mac := hmac.New(sha256.New, sessionSecret)
	mac.Write([]byte(value))
	expected := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return "", false
	}
	return value, true
}

func isLoggedIn(r *http.Request) bool {
	c, err := r.Cookie("admsession")
	if err != nil {
		return false
	}
	val, ok := verifySession(c.Value)
	return ok && val == "ok"
}

func setSession(w http.ResponseWriter) {
	signed := signSession("ok")
	http.SetCookie(w, &http.Cookie{
		Name:     "admsession",
		Value:    signed,
		Path:     "/admin",
		HttpOnly: true,
		MaxAge:   86400 * 7, // 7 days
		SameSite: http.SameSiteLaxMode,
	})
}

func clearSession(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:    "admsession",
		Value:   "",
		Path:    "/admin",
		MaxAge:  -1,
	})
}

// ── Strapi helpers ────────────────────────────────────────────────────────────

func strapiReq(method, path string, body interface{}) (*http.Response, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(map[string]interface{}{"data": body})
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, strapiURL+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+strapiToken)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	client := &http.Client{Timeout: 10 * time.Second}
	return client.Do(req)
}

func strapiGet(path string) (map[string]interface{}, error) {
	resp, err := strapiReq("GET", path, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

// ── Handlers ──────────────────────────────────────────────────────────────────

func Login(w http.ResponseWriter, r *http.Request) {
	if isLoggedIn(r) {
		http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
		return
	}
	errMsg := ""
	if r.Method == "POST" {
		r.ParseForm()
		if r.FormValue("password") == adminPassword {
			setSession(w)
			http.Redirect(w, r, "/admin/dashboard", http.StatusFound)
			return
		}
		errMsg = "Kata sandi salah."
	}
	tmpl.ExecuteTemplate(w, "login.html", map[string]interface{}{"Error": errMsg})
}

func Logout(w http.ResponseWriter, r *http.Request) {
	clearSession(w)
	http.Redirect(w, r, "/admin", http.StatusFound)
}

func Dashboard(w http.ResponseWriter, r *http.Request) {
	if !isLoggedIn(r) {
		http.Redirect(w, r, "/admin", http.StatusFound)
		return
	}
	tab := r.URL.Query().Get("tab")
	if tab == "" {
		tab = "pengumuman"
	}

	data := map[string]interface{}{
		"Tab":         tab,
		"StrapiToken": strapiToken,
		"StrapiURL":   "", // empty — calls go through /admin/proxy
	}
	tmpl.ExecuteTemplate(w, "dashboard.html", data)
}

// Proxy handles all AJAX calls from the dashboard so the Strapi token
// never leaves the server.
func Proxy(w http.ResponseWriter, r *http.Request) {
	if !isLoggedIn(r) {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// /admin/proxy/<rest-of-path>
	subpath := strings.TrimPrefix(r.URL.Path, "/admin/proxy")
	if subpath == "" {
		subpath = "/"
	}
	// forward query string
	if r.URL.RawQuery != "" {
		subpath += "?" + r.URL.RawQuery
	}

	var bodyData interface{}
	if r.ContentLength > 0 {
		var raw map[string]interface{}
		json.NewDecoder(r.Body).Decode(&raw)
		// if caller already wraps in {data:...} unwrap, else pass through
		if d, ok := raw["data"]; ok {
			bodyData = d
		} else {
			bodyData = raw
		}
	}

	resp, err := strapiReq(r.Method, subpath, bodyData)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"%s"}`, err.Error()), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
