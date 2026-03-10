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

type dataItem struct {
	ID         int                    `json:"id"`
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

// ── public API ────────────────────────────────────────────────────────────────

// GetAnnouncements returns up to limit announcements sorted newest-first.
func (c *Client) GetAnnouncements(limit int) ([]Announcement, error) {
	var raw listResponse
	path := fmt.Sprintf(
		"/api/announcements?sort=createdAt:desc&pagination[limit]=%d", limit,
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
