package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	GinMode         string
	MinioEndpoint   string
	MinioAccessKey  string
	MinioSecretKey  string
	MinioUseSSL     bool
	MinioBucketName string
	MongoURI        string
	MongoDatabase   string
}

func LoadConfig() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	useSSL, _ := strconv.ParseBool(getEnv("MINIO_USE_SSL", "false"))

	return &Config{
		Port:            getEnv("PORT", "8080"),
		GinMode:         getEnv("GIN_MODE", "debug"),
		MinioEndpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioUseSSL:     useSSL,
		MinioBucketName: getEnv("MINIO_BUCKET_NAME", "mediavault"),
		MongoURI:        getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDatabase:   getEnv("MONGODB_DATABASE", "mediavault"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
