package handlers

import (
	"blasce-api/internal/db"
	"database/sql"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = func() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		s = "blasce-dev-secret-change-in-production"
	}
	return []byte(s)
}()

type signupRequest struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token       string `json:"token"`
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	CreatedAt   string `json:"createdAt"`
}

func Signup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.DisplayName == "" {
		writeError(w, http.StatusBadRequest, "displayName, email, and password are required")
		return
	}
	if len(req.Password) < 6 {
		writeError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	var id, email, displayName, createdAt string
	err = db.DB.QueryRow(`
		INSERT INTO users (email, password_hash, display_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, display_name, created_at::text
	`, req.Email, string(hash), req.DisplayName).Scan(&id, &email, &displayName, &createdAt)
	if err != nil {
		if err.Error() == `pq: duplicate key value violates unique constraint "users_email_key"` {
			writeError(w, http.StatusConflict, "An account with that email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "Failed to create account: "+err.Error())
		return
	}

	token, err := makeToken(id, email, displayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	jsonResponse(w, http.StatusCreated, authResponse{
		Token: token, ID: id, Email: email, DisplayName: displayName, CreatedAt: createdAt,
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	var id, email, displayName, createdAt, hash string
	err := db.DB.QueryRow(`
		SELECT id, email, display_name, password_hash, created_at::text
		FROM users WHERE email = $1
	`, req.Email).Scan(&id, &email, &displayName, &hash, &createdAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := makeToken(id, email, displayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	jsonResponse(w, http.StatusOK, authResponse{
		Token: token, ID: id, Email: email, DisplayName: displayName, CreatedAt: createdAt,
	})
}

func Me(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		writeError(w, http.StatusUnauthorized, "Missing or invalid Authorization header")
		return
	}
	tokenStr := authHeader[7:]

	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		return jwtSecret, nil
	})
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid or expired token")
		return
	}

	id, _ := claims["sub"].(string)
	var email, displayName, createdAt string
	err = db.DB.QueryRow(`
		SELECT email, display_name, created_at::text FROM users WHERE id = $1
	`, id).Scan(&email, &displayName, &createdAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Database error")
		return
	}

	jsonResponse(w, http.StatusOK, authResponse{
		ID: id, Email: email, DisplayName: displayName, CreatedAt: createdAt,
	})
}

func makeToken(id, email, displayName string) (string, error) {
	claims := jwt.MapClaims{
		"sub":         id,
		"email":       email,
		"displayName": displayName,
		"exp":         time.Now().Add(30 * 24 * time.Hour).Unix(),
		"iat":         time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}
