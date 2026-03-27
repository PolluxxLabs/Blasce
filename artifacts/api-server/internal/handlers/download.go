package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type YTSTorrent struct {
	Quality     string `json:"quality"`
	Type        string `json:"type"`
	VideoCodec  string `json:"video_codec"`
	Seeds       int    `json:"seeds"`
	Peers       int    `json:"peers"`
	Size        string `json:"size"`
	SizeBytes   int64  `json:"size_bytes"`
	DateUploaded string `json:"date_uploaded"`
	Hash        string `json:"hash"`
}

type YTSMovie struct {
	ID               int          `json:"id"`
	URL              string       `json:"url"`
	ImdbCode         string       `json:"imdb_code"`
	Title            string       `json:"title"`
	Year             int          `json:"year"`
	Rating           float64      `json:"rating"`
	Runtime          int          `json:"runtime"`
	Genres           []string     `json:"genres"`
	Summary          string       `json:"summary"`
	LanguageCode     string       `json:"language"`
	MediumCoverImage string       `json:"medium_cover_image"`
	LargeCoverImage  string       `json:"large_cover_image"`
	Torrents         []YTSTorrent `json:"torrents"`
}

type YTSResponse struct {
	Status        string `json:"status"`
	StatusMessage string `json:"status_message"`
	Data          struct {
		MovieCount int        `json:"movie_count"`
		Movies     []YTSMovie `json:"movies"`
	} `json:"data"`
}

type DownloadOption struct {
	Quality    string `json:"quality"`
	Type       string `json:"type"`
	Size       string `json:"size"`
	Seeds      int    `json:"seeds"`
	Peers      int    `json:"peers"`
	MagnetLink string `json:"magnetLink"`
	TorrentURL string `json:"torrentUrl"`
}

type DownloadResponse struct {
	Title    string           `json:"title"`
	Year     int              `json:"year"`
	ImdbCode string           `json:"imdbCode"`
	PageURL  string           `json:"pageUrl"`
	Options  []DownloadOption `json:"options"`
}

var downloadHTTPClient = &http.Client{Timeout: 10 * time.Second}

// TrackerList is the standard set of trackers for YTS magnet links
var trackerList = []string{
	"udp://open.demonii.com:1337/announce",
	"udp://tracker.openbittorrent.com:80",
	"udp://tracker.coppersurfer.tk:6969",
	"udp://glotorrents.pw:6969/announce",
	"udp://tracker.opentrackr.org:1337/announce",
	"udp://torrent.gresille.org:80/announce",
	"udp://p4p.arenabg.com:1337",
	"udp://tracker.leechers-paradise.org:6969",
}

func buildMagnetLink(hash, title string) string {
	var sb strings.Builder
	sb.WriteString("magnet:?xt=urn:btih:")
	sb.WriteString(hash)
	sb.WriteString("&dn=")
	sb.WriteString(url.QueryEscape(title))
	for _, tracker := range trackerList {
		sb.WriteString("&tr=")
		sb.WriteString(url.QueryEscape(tracker))
	}
	return sb.String()
}

func GetDownloadLinks(w http.ResponseWriter, r *http.Request) {
	imdbID := r.URL.Query().Get("imdb")
	contentType := r.URL.Query().Get("type")

	if contentType == "tv" {
		w.Header().Set("Content-Type", "application/json")
		http.Error(w, `{"error":"TV show downloads are not supported via this endpoint"}`, http.StatusNotFound)
		return
	}

	if imdbID == "" {
		http.Error(w, `{"error":"imdb query param required"}`, http.StatusBadRequest)
		return
	}

	ytsURL := fmt.Sprintf("https://yts.mx/api/v2/list_movies.json?query_term=%s&limit=1", url.QueryEscape(imdbID))
	resp, err := downloadHTTPClient.Get(ytsURL)
	if err != nil {
		http.Error(w, `{"error":"failed to fetch download info"}`, http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	var ytsResp YTSResponse
	if err := json.NewDecoder(resp.Body).Decode(&ytsResp); err != nil {
		http.Error(w, `{"error":"failed to parse download info"}`, http.StatusInternalServerError)
		return
	}

	if ytsResp.Data.MovieCount == 0 || len(ytsResp.Data.Movies) == 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "no download available"})
		return
	}

	movie := ytsResp.Data.Movies[0]

	options := make([]DownloadOption, 0, len(movie.Torrents))
	for _, t := range movie.Torrents {
		magnet := buildMagnetLink(t.Hash, movie.Title)
		torrentURL := fmt.Sprintf("https://yts.mx/torrent/download/%s", t.Hash)
		options = append(options, DownloadOption{
			Quality:    t.Quality,
			Type:       t.Type,
			Size:       t.Size,
			Seeds:      t.Seeds,
			Peers:      t.Peers,
			MagnetLink: magnet,
			TorrentURL: torrentURL,
		})
	}

	result := DownloadResponse{
		Title:    movie.Title,
		Year:     movie.Year,
		ImdbCode: movie.ImdbCode,
		PageURL:  movie.URL,
		Options:  options,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
