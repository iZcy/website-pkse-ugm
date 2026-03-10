package strapi

import (
"encoding/json"
"fmt"
"net/http"
"time"
)

// Client is a simple Strapi v4 REST API client.
type Client struct {
baseURL    string
httpClient *http.Client
}

// New creates a Strapi client pointing at baseURL (e.g. "http://strapi:1337").
func New(baseURL string) *Client {
return &Client{
baseURL: baseURL,
httpClient: &http.Client{
Timeout: 10 * time.Second,
},
}
}

// ── internal response shapes ──────────────────────────────────────────────────

type listResponse struct {
Data []dataItem `json:"data"`
}

type singleResponse struct {
Data singleItem `json:"data"`
}

type dataItem struct {
ID         int                    `json:"id"`
Attributes map[string]interface{} `json:"attributes"`
}

type singleItem struct {
Attributes map[string]interface{} `json:"attributes"`
}

// ── public data types ─────────────────────────────────────────────────────────

// Announcement mirrors the Strapi Announcement content type.
type Announcement struct {
ID        int
Title     string
Content   string
CreatedAt string
}

// Department mirrors the Strapi Department content type.
type Department struct {
ID          int
Name        string
Description string
IconClass   string
SortOrder   int
}

// Officer mirrors the Strapi Officer content type.
type Officer struct {
ID         int
Name       string
Role       string
Department string
PhotoURL   string
Tier       string // "inti" | "departemen"
SortOrder  int
}

// SiteSetting mirrors the Strapi Site Setting single type.
type SiteSetting struct {
Sejarah     string
Visi        string
Misi        []string
StatMembers string
StatDept    string
StatProker  string
}

// ── helpers ───────────────────────────────────────────────────────────────────

func (c *Client) get(path string, target interface{}) error {
resp, err := c.httpClient.Get(c.baseURL + path)
if err != nil {
return err
}
defer resp.Body.Close()
if resp.StatusCode != http.StatusOK {
return fmt.Errorf("strapi GET %s returned %d", path, resp.StatusCode)
}
return json.NewDecoder(resp.Body).Decode(target)
}

func str(m map[string]interface{}, key string) string {
if v, ok := m[key]; ok {
if s, ok := v.(string); ok {
return s
}
}
return ""
}

func intVal(m map[string]interface{}, key string) int {
if v, ok := m[key]; ok {
switch n := v.(type) {
case float64:
return int(n)
case int:
return n
}
}
return 0
}

// ── public API ────────────────────────────────────────────────────────────────

// GetAnnouncements returns up to limit announcements sorted newest-first.
func (c *Client) GetAnnouncements(limit int) ([]Announcement, error) {
var raw listResponse
path := fmt.Sprintf(
"/api/announcements?sort=createdAt:desc&pagination[limit]=%d&publicationState=live",
limit,
)
if err := c.get(path, &raw); err != nil {
return nil, err
}

out := make([]Announcement, 0, len(raw.Data))
for _, item := range raw.Data {
out = append(out, Announcement{
ID:        item.ID,
Title:     str(item.Attributes, "title"),
Content:   str(item.Attributes, "content"),
CreatedAt: str(item.Attributes, "createdAt"),
})
}
return out, nil
}

// GetAllAnnouncements returns every announcement sorted newest-first.
func (c *Client) GetAllAnnouncements() ([]Announcement, error) {
return c.GetAnnouncements(1000)
}

// GetDepartments returns all departments sorted by sort_order.
func (c *Client) GetDepartments() ([]Department, error) {
var raw listResponse
if err := c.get("/api/departments?sort=sort_order:asc&pagination[limit]=100", &raw); err != nil {
return nil, err
}

out := make([]Department, 0, len(raw.Data))
for _, item := range raw.Data {
out = append(out, Department{
ID:          item.ID,
Name:        str(item.Attributes, "name"),
Description: str(item.Attributes, "description"),
IconClass:   str(item.Attributes, "icon_class"),
SortOrder:   intVal(item.Attributes, "sort_order"),
})
}
return out, nil
}

// GetOfficers returns all officers sorted by sort_order.
func (c *Client) GetOfficers() ([]Officer, error) {
var raw listResponse
if err := c.get("/api/officers?sort=sort_order:asc&pagination[limit]=200", &raw); err != nil {
return nil, err
}

out := make([]Officer, 0, len(raw.Data))
for _, item := range raw.Data {
out = append(out, Officer{
ID:         item.ID,
Name:       str(item.Attributes, "name"),
Role:       str(item.Attributes, "role"),
Department: str(item.Attributes, "department"),
PhotoURL:   str(item.Attributes, "photo_url"),
Tier:       str(item.Attributes, "tier"),
SortOrder:  intVal(item.Attributes, "sort_order"),
})
}
return out, nil
}

// GetSiteSetting returns the single Site Setting entry.
func (c *Client) GetSiteSetting() (*SiteSetting, error) {
var raw singleResponse
if err := c.get("/api/site-setting", &raw); err != nil {
return nil, err
}
attrs := raw.Data.Attributes

ss := &SiteSetting{
Sejarah:     str(attrs, "sejarah"),
Visi:        str(attrs, "visi"),
StatMembers: str(attrs, "stat_members"),
StatDept:    str(attrs, "stat_dept"),
StatProker:  str(attrs, "stat_proker"),
}

// misi is stored as JSON array of strings
if v, ok := attrs["misi"]; ok && v != nil {
if arr, ok := v.([]interface{}); ok {
for _, item := range arr {
if s, ok := item.(string); ok {
ss.Misi = append(ss.Misi, s)
}
}
}
}

return ss, nil
}
