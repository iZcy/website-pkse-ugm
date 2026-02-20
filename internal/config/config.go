package config

import (
	"os"
)

type Config struct {
	Port        string
	DatabasePath string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data.db"
	}

	return &Config{
		Port:        port,
		DatabasePath: dbPath,
	}
}
