package auth

import (
"crypto/hmac"
"crypto/sha256"
"encoding/hex"
"net/http"
"os"
"strings"
)

var sessionSecret []byte

func Init() {
secret := os.Getenv("ADMIN_SESSION_SECRET")
if secret == "" {
secret = "changeme-secret"
}
sessionSecret = []byte(secret)
}

func signSession(value string) string {
mac := hmac.New(sha256.New, sessionSecret)
mac.Write([]byte(value))
return value + "." + hex.EncodeToString(mac.Sum(nil))
}

func verifySession(signed string) (string, bool) {
idx := strings.LastIndex(signed, ".")
if idx < 0 {
return "", false
}
value, sig := signed[:idx], signed[idx+1:]
mac := hmac.New(sha256.New, sessionSecret)
mac.Write([]byte(value))
expected := hex.EncodeToString(mac.Sum(nil))
if !hmac.Equal([]byte(sig), []byte(expected)) {
return "", false
}
return value, true
}

func IsLoggedIn(r *http.Request) bool {
c, err := r.Cookie("admsession")
if err != nil {
return false
}
val, ok := verifySession(c.Value)
return ok && val == "ok"
}

func SetSession(w http.ResponseWriter) {
signed := signSession("ok")
http.SetCookie(w, &http.Cookie{
Name:     "admsession",
Value:    signed,
Path:     "/",
HttpOnly: true,
MaxAge:   86400 * 7,
SameSite: http.SameSiteLaxMode,
})
}

func ClearSession(w http.ResponseWriter) {
http.SetCookie(w, &http.Cookie{
Name:   "admsession",
Value:  "",
Path:   "/",
MaxAge: -1,
})
}
