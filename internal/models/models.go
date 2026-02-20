package models

import "time"

type Announcement struct {
	ID        int
	Title     string
	Content   string
	CreatedAt time.Time
}

type Member struct {
	ID         int
	Name       string
	Role       string
	Department string
	ImageURL   string
}
