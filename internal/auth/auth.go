package auth

import (
"crypto/hmac"
"crypto/sha256"
"encoding/hex"
"net/http"
"os"
"strings"

"golang.org/x/crypto/bcrypt"
)

var sessionSecret []byte

func Init() {
secret := os.Getenv("ADMIN_SESSION_SECRET")
if secret == "" {
secret = "changeme-secret"
}
sessionSecret = []byte(secret)
}

func HashPassword(plain string) (string, error) {
b, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
return string(b), err
}

func CheckPassword(hash, plain string) bool {
return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

func signValue(value string) string {
mac := hmac.New(sha256.New, sessionSecret)
mac.Write([]byte(value))
return value + "." + hex.EncodeToString(mac.Sum(nil))
}

func verifyValue(signed string) (string, bool) {
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

func SetSession(w http.ResponseWriter, username, role string) {
payload := username + "|" + role
http.SetCookie(w, &http.Cookie{
Name:     "admsession",
Value:    signValue(payload),
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

func GetSessionUser(r *http.Request) (string, string, bool) {
c, err := r.Cookie("admsession")
if err != nil {
return "", "", false
}
value, ok := verifyValue(c.Value)
if !ok {
return "", "", false
}
parts := strings.SplitN(value, "|", 2)
if len(parts) != 2 {
return "", "", false
}
return parts[0], parts[1], true
}

func IsLoggedIn(r *http.Request) bool {
_, _, ok := GetSessionUser(r)
return ok
}

func IsSuperAdmin(r *http.Request) bool {
_, role, ok := GetSessionUser(r)
return ok && role == "superadmin"
}
