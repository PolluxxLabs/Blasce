package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// omdbCache caches responses for 24 hours to avoid hitting rate limits.
var omdbCache sync.Map

type omdbCacheEntry struct {
	data      *RatingsResponse
	expiresAt time.Time
}

// RatingsResponse is the JSON returned by /api/ratings.
type RatingsResponse struct {
	ImdbID       string  `json:"imdbId"`
	ImdbRating   float64 `json:"imdbRating"`   // 0 if unavailable
	ImdbVotes    string  `json:"imdbVotes"`    // e.g. "2,793,322"
	RtScore      int     `json:"rtScore"`      // 0 if unavailable
	Metacritic   int     `json:"metacritic"`   // 0 if unavailable
	ImdbUrl      string  `json:"imdbUrl"`
	RtSearchUrl  string  `json:"rtSearchUrl"`
}

// omdbRaw mirrors the relevant fields of the OMDb API response.
type omdbRaw struct {
	Response   string `json:"Response"`
	ImdbRating string `json:"imdbRating"`
	ImdbVotes  string `json:"imdbVotes"`
	ImdbID     string `json:"imdbID"`
	Metascore  string `json:"Metascore"`
	Title      string `json:"Title"`
	Year       string `json:"Year"`
	Ratings    []struct {
		Source string `json:"Source"`
		Value  string `json:"Value"`
	} `json:"Ratings"`
}

func omdbAPIKey() string {
	if k := os.Getenv("OMDB_API_KEY"); k != "" {
		return k
	}
	return "thewdb"
}

func fetchOMDB(imdbID string) (*RatingsResponse, error) {
	if v, ok := omdbCache.Load(imdbID); ok {
		entry := v.(omdbCacheEntry)
		if time.Now().Before(entry.expiresAt) {
			return entry.data, nil
		}
	}

	url := fmt.Sprintf("https://www.omdbapi.com/?i=%s&apikey=%s", imdbID, omdbAPIKey())
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var raw omdbRaw
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if raw.Response != "True" {
		return nil, fmt.Errorf("omdb: no data for %s", imdbID)
	}

	result := &RatingsResponse{
		ImdbID:      imdbID,
		ImdbVotes:   raw.ImdbVotes,
		ImdbUrl:     fmt.Sprintf("https://www.imdb.com/title/%s/", imdbID),
		RtSearchUrl: fmt.Sprintf("https://www.rottentomatoes.com/search?search=%s", strings.ReplaceAll(raw.Title, " ", "+")),
	}

	if f, err := strconv.ParseFloat(raw.ImdbRating, 64); err == nil {
		result.ImdbRating = f
	}
	if n, err := strconv.Atoi(raw.Metascore); err == nil {
		result.Metacritic = n
	}

	for _, r := range raw.Ratings {
		if r.Source == "Rotten Tomatoes" {
			pct := strings.TrimSuffix(r.Value, "%")
			if n, err := strconv.Atoi(pct); err == nil {
				result.RtScore = n
			}
		}
	}

	omdbCache.Store(imdbID, omdbCacheEntry{data: result, expiresAt: time.Now().Add(24 * time.Hour)})
	return result, nil
}

// GetRatings handles GET /api/ratings?imdb=tt1375666
func GetRatings(w http.ResponseWriter, r *http.Request) {
	imdbID := r.URL.Query().Get("imdb")
	if imdbID == "" {
		http.Error(w, `{"error":"imdb param required"}`, http.StatusBadRequest)
		return
	}

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=86400")

	data, err := fetchOMDB(imdbID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	json.NewEncoder(w).Encode(data)
}
