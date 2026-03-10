package cms

import (
"encoding/json"
"net/http"
"strings"

"go.mongodb.org/mongo-driver/bson"
"webapp/internal/auth"
"webapp/internal/db"
)

func guard(w http.ResponseWriter, r *http.Request) bool {
if !auth.IsLoggedIn(r) {
w.Header().Set("Content-Type", "application/json")
http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
return false
}
return true
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
w.Header().Set("Content-Type", "application/json")
w.WriteHeader(status)
json.NewEncoder(w).Encode(v)
}

func lastSegment(path string) string {
path = strings.TrimSuffix(path, "/")
parts := strings.Split(path, "/")
return parts[len(parts)-1]
}

func Announcements(w http.ResponseWriter, r *http.Request) {
if !guard(w, r) {
return
}
seg := lastSegment(r.URL.Path)
if seg == "announcements" {
switch r.Method {
case "GET":
items, err := db.GetAnnouncements(0, false)
if err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, items)
case "POST":
var a db.Announcement
if err := json.NewDecoder(r.Body).Decode(&a); err != nil {
writeJSON(w, 400, map[string]string{"error": "invalid json"})
return
}
if err := db.CreateAnnouncement(&a); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 201, a)
default:
http.Error(w, "method not allowed", 405)
}
return
}
id := seg
switch r.Method {
case "GET":
a, err := db.GetAnnouncementByID(id)
if err != nil {
writeJSON(w, 404, map[string]string{"error": "not found"})
return
}
writeJSON(w, 200, a)
case "PUT":
var fields map[string]interface{}
if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
writeJSON(w, 400, map[string]string{"error": "invalid json"})
return
}
update := bson.M{}
for k, v := range fields {
update[k] = v
}
if err := db.UpdateAnnouncement(id, update); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
case "DELETE":
if err := db.DeleteAnnouncement(id); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
default:
http.Error(w, "method not allowed", 405)
}
}

func Departments(w http.ResponseWriter, r *http.Request) {
if !guard(w, r) {
return
}
seg := lastSegment(r.URL.Path)
if seg == "departments" {
switch r.Method {
case "GET":
items, err := db.GetDepartments()
if err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, items)
case "POST":
var d db.Department
json.NewDecoder(r.Body).Decode(&d)
if err := db.CreateDepartment(&d); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 201, d)
default:
http.Error(w, "method not allowed", 405)
}
return
}
id := seg
switch r.Method {
case "PUT":
var fields map[string]interface{}
json.NewDecoder(r.Body).Decode(&fields)
update := bson.M{}
for k, v := range fields {
update[k] = v
}
if err := db.UpdateDepartment(id, update); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
case "DELETE":
if err := db.DeleteDepartment(id); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
default:
http.Error(w, "method not allowed", 405)
}
}

func Officers(w http.ResponseWriter, r *http.Request) {
if !guard(w, r) {
return
}
seg := lastSegment(r.URL.Path)
if seg == "officers" {
switch r.Method {
case "GET":
items, err := db.GetOfficers()
if err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, items)
case "POST":
var o db.Officer
json.NewDecoder(r.Body).Decode(&o)
if err := db.CreateOfficer(&o); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 201, o)
default:
http.Error(w, "method not allowed", 405)
}
return
}
id := seg
switch r.Method {
case "PUT":
var fields map[string]interface{}
json.NewDecoder(r.Body).Decode(&fields)
update := bson.M{}
for k, v := range fields {
update[k] = v
}
if err := db.UpdateOfficer(id, update); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
case "DELETE":
if err := db.DeleteOfficer(id); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
default:
http.Error(w, "method not allowed", 405)
}
}

func SiteSetting(w http.ResponseWriter, r *http.Request) {
if !guard(w, r) {
return
}
switch r.Method {
case "GET":
ss, err := db.GetSiteSetting()
if err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, ss)
case "PUT":
var fields map[string]interface{}
if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
writeJSON(w, 400, map[string]string{"error": "invalid json"})
return
}
update := bson.M{}
for k, v := range fields {
update[k] = v
}
if err := db.UpsertSiteSetting(update); err != nil {
writeJSON(w, 500, map[string]string{"error": err.Error()})
return
}
writeJSON(w, 200, map[string]string{"ok": "1"})
default:
http.Error(w, "method not allowed", 405)
}
}
