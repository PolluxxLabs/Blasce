package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
)

var scraperClient = &http.Client{Timeout: 60 * time.Second}

func scraperBaseURL() string {
	u := os.Getenv("SCRAPER_URL")
	if u == "" {
		u = "http://localhost:8001"
	}
	return u
}

func proxyToScraper(w http.ResponseWriter, r *http.Request, path string) {
	base := scraperBaseURL()
	target := fmt.Sprintf("%s%s", base, path)

	if r.URL.RawQuery != "" {
		target += "?" + r.URL.RawQuery
	}

	log.Printf("[scraper-proxy] -> %s", target)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, target, nil)
	if err != nil {
		http.Error(w, `{"error":"proxy request error"}`, http.StatusInternalServerError)
		return
	}

	resp, err := scraperClient.Do(req)
	if err != nil {
		log.Printf("[scraper-proxy] error: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error":   "Scraper unavailable",
			"sources": []interface{}{},
		})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=1800")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// GetSources returns direct MP4/HLS stream sources for a movie or episode.
// GET /api/scraper/sources/{id}?season=1&episode=1
func GetSources(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, `{"error":"id required"}`, http.StatusBadRequest)
		return
	}
	path := fmt.Sprintf("/sources/%s", url.PathEscape(id))
	proxyToScraper(w, r, path)
}

// GetDownloadDirect returns the best direct download URL for a movie or episode.
// GET /api/scraper/download/{id}?quality=1080p
func GetDownloadDirect(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, `{"error":"id required"}`, http.StatusBadRequest)
		return
	}
	path := fmt.Sprintf("/download/%s", url.PathEscape(id))
	proxyToScraper(w, r, path)
}

// GetScraperSearch searches the MovieBox catalog.
// GET /api/scraper/search?q=inception&page=1
func GetScraperSearch(w http.ResponseWriter, r *http.Request) {
	proxyToScraper(w, r, "/search")
}

// GetScraperMovie returns full detail for a MovieBox movie ID.
// GET /api/scraper/movie/{id}
func GetScraperMovie(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, `{"error":"id required"}`, http.StatusBadRequest)
		return
	}
	proxyToScraper(w, r, fmt.Sprintf("/movie/%s", url.PathEscape(id)))
}

// GetScraperHealth checks if the Python scraper is reachable.
// GET /api/scraper/health
func GetScraperHealth(w http.ResponseWriter, r *http.Request) {
	proxyToScraper(w, r, "/health")
}
