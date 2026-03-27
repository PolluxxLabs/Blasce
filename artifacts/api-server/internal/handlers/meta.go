package handlers

import (
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "strconv"
        "strings"
        "sync"
        "time"
)

func parseFloat(s string) float64 {
        if s == "" || s == "N/A" {
                return 0
        }
        f, _ := strconv.ParseFloat(s, 64)
        return f
}

func parseInt(s string) int {
        if s == "" || s == "N/A" {
                return 0
        }
        n, _ := strconv.Atoi(strings.TrimSpace(s))
        return n
}

var metaCache sync.Map

type metaCacheEntry struct {
        data      *MetaResponse
        expiresAt time.Time
}

// MetaResponse is the JSON returned by /api/meta.
type MetaResponse struct {
        ImdbID    string   `json:"imdbId"`
        Title     string   `json:"title"`
        Year      string   `json:"year"`
        Rated     string   `json:"rated"`
        Released  string   `json:"released"`
        Runtime   string   `json:"runtime"`
        Genres    []string `json:"genres"`
        Directors []string `json:"directors"`
        Writers   []string `json:"writers"`
        Actors    []string `json:"actors"`
        Plot      string   `json:"plot"`
        Language  string   `json:"language"`
        Country   string   `json:"country"`
        Awards    string   `json:"awards"`
        Poster    string   `json:"poster"`
        BoxOffice string   `json:"boxOffice"`
        Type      string   `json:"type"`
        // Ratings
        ImdbRating  float64 `json:"imdbRating"`
        ImdbVotes   string  `json:"imdbVotes"`
        RtScore     int     `json:"rtScore"`
        Metacritic  int     `json:"metacritic"`
        ImdbUrl     string  `json:"imdbUrl"`
        RtSearchUrl string  `json:"rtSearchUrl"`
}

type omdbFullRaw struct {
        Response   string `json:"Response"`
        Title      string `json:"Title"`
        Year       string `json:"Year"`
        Rated      string `json:"Rated"`
        Released   string `json:"Released"`
        Runtime    string `json:"Runtime"`
        Genre      string `json:"Genre"`
        Director   string `json:"Director"`
        Writer     string `json:"Writer"`
        Actors     string `json:"Actors"`
        Plot       string `json:"Plot"`
        Language   string `json:"Language"`
        Country    string `json:"Country"`
        Awards     string `json:"Awards"`
        Poster     string `json:"Poster"`
        BoxOffice  string `json:"BoxOffice"`
        Type       string `json:"Type"`
        Metascore  string `json:"Metascore"`
        ImdbRating string `json:"imdbRating"`
        ImdbVotes  string `json:"imdbVotes"`
        ImdbID     string `json:"imdbID"`
        Ratings    []struct {
                Source string `json:"Source"`
                Value  string `json:"Value"`
        } `json:"Ratings"`
}

func splitClean(s string) []string {
        if s == "" || s == "N/A" {
                return nil
        }
        parts := strings.Split(s, ",")
        out := make([]string, 0, len(parts))
        for _, p := range parts {
                p = strings.TrimSpace(p)
                if p != "" && p != "N/A" {
                        out = append(out, p)
                }
        }
        return out
}

func na(s string) string {
        if s == "N/A" || s == "" {
                return ""
        }
        return s
}

func fetchMeta(imdbID string) (*MetaResponse, error) {
        if v, ok := metaCache.Load(imdbID); ok {
                entry := v.(metaCacheEntry)
                if time.Now().Before(entry.expiresAt) {
                        return entry.data, nil
                }
        }

        url := fmt.Sprintf("https://www.omdbapi.com/?i=%s&plot=full&apikey=%s", imdbID, omdbAPIKey())
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

        var raw omdbFullRaw
        if err := json.Unmarshal(body, &raw); err != nil {
                return nil, err
        }
        if raw.Response != "True" {
                return nil, fmt.Errorf("omdb: no data for %s", imdbID)
        }

        result := &MetaResponse{
                ImdbID:    imdbID,
                Title:     na(raw.Title),
                Year:      na(raw.Year),
                Rated:     na(raw.Rated),
                Released:  na(raw.Released),
                Runtime:   na(raw.Runtime),
                Genres:    splitClean(raw.Genre),
                Directors: splitClean(raw.Director),
                Writers:   splitClean(raw.Writer),
                Actors:    splitClean(raw.Actors),
                Plot:      na(raw.Plot),
                Language:  na(raw.Language),
                Country:   na(raw.Country),
                Awards:    na(raw.Awards),
                BoxOffice: na(raw.BoxOffice),
                Type:      na(raw.Type),
                ImdbVotes: na(raw.ImdbVotes),
                ImdbUrl:   fmt.Sprintf("https://www.imdb.com/title/%s/", imdbID),
        }

        if poster := na(raw.Poster); poster != "" {
                result.Poster = poster
        }

        if title := na(raw.Title); title != "" {
                result.RtSearchUrl = fmt.Sprintf("https://www.rottentomatoes.com/search?search=%s", strings.ReplaceAll(title, " ", "+"))
        }

        // Parse ratings
        if f := parseFloat(raw.ImdbRating); f > 0 {
                result.ImdbRating = f
        }
        if n := parseInt(raw.Metascore); n > 0 {
                result.Metacritic = n
        }
        for _, r := range raw.Ratings {
                if r.Source == "Rotten Tomatoes" {
                        pct := strings.TrimSuffix(r.Value, "%")
                        if n := parseInt(pct); n > 0 {
                                result.RtScore = n
                        }
                }
        }

        metaCache.Store(imdbID, metaCacheEntry{data: result, expiresAt: time.Now().Add(24 * time.Hour)})
        return result, nil
}

// GetMeta handles GET /api/meta?imdb=tt1375666
func GetMeta(w http.ResponseWriter, r *http.Request) {
        imdbID := r.URL.Query().Get("imdb")
        if imdbID == "" {
                http.Error(w, `{"error":"imdb param required"}`, http.StatusBadRequest)
                return
        }

        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Cache-Control", "public, max-age=86400")

        data, err := fetchMeta(imdbID)
        if err != nil {
                w.WriteHeader(http.StatusNotFound)
                json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
                return
        }

        json.NewEncoder(w).Encode(data)
}
