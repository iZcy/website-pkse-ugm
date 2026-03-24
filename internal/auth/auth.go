package auth

import (
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	accessCookieName  = "adm_access"
	refreshCookieName = "adm_refresh"
)

var (
	accessSecret  []byte
	refreshSecret []byte
	accessTTL     = 15 * time.Minute
	refreshTTL    = 7 * 24 * time.Hour
)

func Init() {
	access := os.Getenv("ADMIN_JWT_ACCESS_SECRET")
	if access == "" {
		access = os.Getenv("ADMIN_SESSION_SECRET")
	}
	if access == "" {
		access = "changeme-access-secret"
	}
	refresh := os.Getenv("ADMIN_JWT_REFRESH_SECRET")
	if refresh == "" {
		refresh = access + "-refresh"
	}

	if v := os.Getenv("ADMIN_JWT_ACCESS_TTL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			accessTTL = d
		}
	}
	if v := os.Getenv("ADMIN_JWT_REFRESH_TTL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			refreshTTL = d
		}
	}

	accessSecret = []byte(access)
	refreshSecret = []byte(refresh)
}

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	return string(b), err
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

func issueToken(username, role, tokenType string, ttl time.Duration, secret []byte) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":  username,
		"role": role,
		"typ":  tokenType,
		"iat":  now.Unix(),
		"exp":  now.Add(ttl).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString(secret)
}

func parseToken(tokenStr string, expectedType string, secret []byte) (string, string, bool) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return secret, nil
	})
	if err != nil || token == nil || !token.Valid {
		return "", "", false
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", "", false
	}
	typ, _ := claims["typ"].(string)
	if typ != expectedType {
		return "", "", false
	}
	sub, _ := claims["sub"].(string)
	role, _ := claims["role"].(string)
	if sub == "" || role == "" {
		return "", "", false
	}
	return sub, role, true
}

func setCookie(w http.ResponseWriter, name, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		MaxAge:   maxAge,
		SameSite: http.SameSiteLaxMode,
	})
}

func SetSession(w http.ResponseWriter, username, role string) {
	accessToken, err := issueToken(username, role, "access", accessTTL, accessSecret)
	if err != nil {
		return
	}
	refreshToken, err := issueToken(username, role, "refresh", refreshTTL, refreshSecret)
	if err != nil {
		return
	}

	setCookie(w, accessCookieName, accessToken, int(accessTTL.Seconds()))
	setCookie(w, refreshCookieName, refreshToken, int(refreshTTL.Seconds()))
}

func ClearSession(w http.ResponseWriter) {
	setCookie(w, accessCookieName, "", -1)
	setCookie(w, refreshCookieName, "", -1)
}

func GetSessionUser(r *http.Request) (string, string, bool) {
	c, err := r.Cookie(accessCookieName)
	if err != nil || c.Value == "" {
		return "", "", false
	}
	return parseToken(c.Value, "access", accessSecret)
}

func ResolveSession(w http.ResponseWriter, r *http.Request) (string, string, bool) {
	if u, role, ok := GetSessionUser(r); ok {
		return u, role, true
	}

	rc, err := r.Cookie(refreshCookieName)
	if err != nil || rc.Value == "" {
		return "", "", false
	}

	u, role, ok := parseToken(rc.Value, "refresh", refreshSecret)
	if !ok {
		return "", "", false
	}

	SetSession(w, u, role)
	return u, role, true
}

func IsLoggedIn(r *http.Request) bool {
	_, _, ok := GetSessionUser(r)
	return ok
}

func IsSuperAdmin(r *http.Request) bool {
	_, role, ok := GetSessionUser(r)
	return ok && role == "superadmin"
}
