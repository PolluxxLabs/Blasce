package handlers

import (
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "net/url"
        "regexp"
        "strings"
        "time"
)

var httpClient = &http.Client{
        Timeout: 15 * time.Second,
}

func fetchURL(targetURL, referer, ua string) ([]byte, string, error) {
        req, err := http.NewRequest("GET", targetURL, nil)
        if err != nil {
                return nil, "", err
        }
        req.Header.Set("User-Agent", ua)
        if referer != "" {
                req.Header.Set("Referer", referer)
        }
        req.Header.Set("Accept", "text/html,application/xhtml+xml,*/*;q=0.8")

        resp, err := httpClient.Do(req)
        if err != nil {
                return nil, "", err
        }
        defer resp.Body.Close()

        if resp.StatusCode != 200 {
                return nil, "", fmt.Errorf("HTTP %d from %s", resp.StatusCode, targetURL)
        }

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, "", err
        }
        return body, resp.Header.Get("Content-Type"), nil
}

var cloudnestraTokenRe = regexp.MustCompile(`cloudnestra\.com/rcp/([A-Za-z0-9+/=_\-]+)`)
var proRcpRe = regexp.MustCompile(`(/prorcp/[A-Za-z0-9+/=_\-]+)`)
var sbxScriptRe = regexp.MustCompile(`<script[^>]+/sbx\.js[^>]*></script>`)
var relSrcRe = regexp.MustCompile(`(src|href)=(['"])\/([^/])`)

// CDN domain regex: extracts just the hostname (e.g. "neonhorizonworkshops.com") from test_doms entries
var cdnDomainRe = regexp.MustCompile(`"https://(?:tmstr\d+|fasdf\d+|app\d+)\.([a-z][a-z0-9.\-]{3,50})"`)

// m3u8 template: captures the full path after {vN} (newer cloudnestra format)
var m3u8TmplRe = regexp.MustCompile(`https://tmstr4\.\{v\d+\}(/pl/[A-Za-z0-9._\-]+/master\.m3u8)`)

// m3u8 path: captures just the /pl/... path when no {vN} template is present (older format)
var m3u8PathRe = regexp.MustCompile(`(/pl/[A-Za-z0-9._\-]{30,}/master\.m3u8)`)

// list.m3u8 path: alternate CDN format
var listM3u8PathRe = regexp.MustCompile(`(/[a-z0-9]+/[A-Za-z0-9._\-]{30,}/list\.m3u8)`)

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

func rewriteRelativeURLs(html, baseURL string) string {
        return relSrcRe.ReplaceAllString(html, `$1=${2}`+baseURL+`/$3`)
}

// buildVsembedURL constructs the vsembed URL for a title.
func buildVsembedURL(imdbID, mediaType, season, episode string) string {
        if mediaType == "tv" {
                if season == "" {
                        season = "1"
                }
                if episode == "" {
                        episode = "1"
                }
                return fmt.Sprintf("https://vsembed.ru/embed/tv/%s/%s/%s/", imdbID, season, episode)
        }
        return fmt.Sprintf("https://vsembed.ru/embed/movie/%s/", imdbID)
}

// resolveCloudnestraHLS fetches the full vsembed→cloudnestra chain and returns direct HLS URL + prorcp HTML.
func resolveCloudnestraHLS(imdbID, mediaType, season, episode string) (hlsURL string, prorcp string, err error) {
        vsembedURL := buildVsembedURL(imdbID, mediaType, season, episode)

        vsHTML, _, err := fetchURL(vsembedURL, "https://vidsrc.to/", ua)
        if err != nil {
                return "", "", fmt.Errorf("vsembed fetch: %w", err)
        }

        match := cloudnestraTokenRe.FindSubmatch(vsHTML)
        if match == nil {
                return "", "", fmt.Errorf("cloudnestra token not found (title may be unavailable)")
        }
        cnToken := string(match[1])

        cnHTML, _, err := fetchURL("https://cloudnestra.com/rcp/"+cnToken, "", ua)
        if err != nil {
                return "", "", fmt.Errorf("cloudnestra rcp: %w", err)
        }

        proRcpMatch := proRcpRe.FindSubmatch(cnHTML)
        if proRcpMatch == nil {
                return "", "", fmt.Errorf("prorcp token not found")
        }
        prorcp_path := string(proRcpMatch[1])

        prorcp_html, _, err := fetchURL("https://cloudnestra.com"+prorcp_path, "https://cloudnestra.com/", ua)
        if err != nil {
                return "", "", fmt.Errorf("prorcp fetch: %w", err)
        }
        prorcp = string(prorcp_html)

        // Extract CDN domains
        domMatches := cdnDomainRe.FindAllStringSubmatch(prorcp, -1)
        seen := map[string]bool{}
        var domains []string
        for _, m := range domMatches {
                d := m[1]
                if !seen[d] {
                        seen[d] = true
                        domains = append(domains, d)
                }
        }
        if len(domains) == 0 {
                return "", prorcp, fmt.Errorf("no CDN domains found in prorcp")
        }

        // Collect all unique m3u8 paths to try.
        // Strategy 1: newer format has full template `https://tmstr4.{vN}/pl/.../master.m3u8`
        // Strategy 2: older format embeds just the path `/pl/.../master.m3u8` in the JS body
        pathsToTry := []string{}
        seenPaths := map[string]bool{}

        for _, m := range m3u8TmplRe.FindAllStringSubmatch(prorcp, -1) {
                if !seenPaths[m[1]] {
                        seenPaths[m[1]] = true
                        pathsToTry = append(pathsToTry, m[1])
                }
        }
        if len(pathsToTry) == 0 {
                // Fallback: extract paths directly
                for _, m := range m3u8PathRe.FindAllStringSubmatch(prorcp, -1) {
                        if !seenPaths[m[1]] {
                                seenPaths[m[1]] = true
                                pathsToTry = append(pathsToTry, m[1])
                        }
                }
        }
        // Also try list.m3u8 paths (alternate CDN format)
        for _, m := range listM3u8PathRe.FindAllStringSubmatch(prorcp, -1) {
                if !seenPaths[m[1]] {
                        seenPaths[m[1]] = true
                        pathsToTry = append(pathsToTry, m[1])
                }
        }

        if len(pathsToTry) == 0 {
                return "", prorcp, fmt.Errorf("no m3u8 paths found in prorcp")
        }

        // Try each CDN domain + path combination until one responds
        for _, path := range pathsToTry[:min(3, len(pathsToTry))] {
                for _, dom := range domains {
                        candidate := "https://tmstr4." + dom + path
                        req, rerr := http.NewRequest("GET", candidate, nil)
                        if rerr != nil {
                                continue
                        }
                        req.Header.Set("User-Agent", ua)
                        req.Header.Set("Referer", "https://cloudnestra.com/")
                        resp, rerr := httpClient.Do(req)
                        if rerr == nil && resp.StatusCode == 200 {
                                resp.Body.Close()
                                return candidate, prorcp, nil
                        }
                        if resp != nil {
                                resp.Body.Close()
                        }
                }
        }

        return "", prorcp, fmt.Errorf("no working CDN server found (tried %d domains × %d paths)", len(domains), len(pathsToTry))
}

// StreamResolveResponse is the JSON shape returned by /api/resolve.
type StreamResolveResponse struct {
        Available      bool   `json:"available"`
        HLSUrl         string `json:"hlsUrl,omitempty"`
        CloudnestraUrl string `json:"cloudnestraUrl,omitempty"` // direct cloudnestra embed URL (ad-free)
        Error          string `json:"error,omitempty"`
}

// getCloudnestraToken returns the cloudnestra rcp token for a title.
func getCloudnestraToken(imdbID, mediaType, season, episode string) (string, error) {
        vsembedURL := buildVsembedURL(imdbID, mediaType, season, episode)
        vsHTML, _, err := fetchURL(vsembedURL, "https://vidsrc.to/", ua)
        if err != nil {
                return "", fmt.Errorf("vsembed fetch: %w", err)
        }
        m := cloudnestraTokenRe.FindSubmatch(vsHTML)
        if m == nil {
                return "", fmt.Errorf("cloudnestra token not found")
        }
        return string(m[1]), nil
}

// Resolve extracts a direct HLS stream URL and/or cloudnestra embed URL for a given IMDB ID.
// GET /api/resolve?imdb=tt1375666&type=movie[&s=1&e=1]
func Resolve(w http.ResponseWriter, r *http.Request) {
        q := r.URL.Query()
        imdbID := q.Get("imdb")
        mediaType := q.Get("type")
        season := q.Get("s")
        episode := q.Get("e")

        if imdbID == "" {
                w.Header().Set("Content-Type", "application/json")
                w.WriteHeader(http.StatusBadRequest)
                json.NewEncoder(w).Encode(StreamResolveResponse{Available: false, Error: "imdb param required"})
                return
        }
        if mediaType == "" {
                mediaType = "movie"
        }

        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Cache-Control", "no-store")

        // Always get the cloudnestra token (for direct iframe embed)
        cnToken, err := getCloudnestraToken(imdbID, mediaType, season, episode)
        if err != nil {
                json.NewEncoder(w).Encode(StreamResolveResponse{Available: false, Error: err.Error()})
                return
        }

        resp := StreamResolveResponse{
                Available:      true,
                CloudnestraUrl: "https://cloudnestra.com/rcp/" + cnToken,
        }

        // Attempt direct HLS extraction (best quality, may fail if CDN unreachable)
        hlsURL, _, hlsErr := resolveCloudnestraHLS(imdbID, mediaType, season, episode)
        if hlsErr == nil && hlsURL != "" {
                resp.HLSUrl = hlsURL
        }

        json.NewEncoder(w).Encode(resp)
}

// StreamProxy resolves a stream from cloudnestra (ad-free) for a given IMDB ID.
// GET /api/stream-proxy?imdb=tt1375666&type=movie  (type = movie|tv, optional s= and e= for TV)
func StreamProxy(w http.ResponseWriter, r *http.Request) {
        q := r.URL.Query()
        imdbID := q.Get("imdb")
        mediaType := q.Get("type")
        season := q.Get("s")
        episode := q.Get("e")

        if imdbID == "" {
                http.Error(w, "imdb param required", http.StatusBadRequest)
                return
        }
        if mediaType == "" {
                mediaType = "movie"
        }

        vsembedURL := buildVsembedURL(imdbID, mediaType, season, episode)

        vsHTML, _, err := fetchURL(vsembedURL, "https://vidsrc.to/", ua)
        if err != nil {
                http.Error(w, "Failed to resolve stream source: "+err.Error(), http.StatusBadGateway)
                return
        }

        match := cloudnestraTokenRe.FindSubmatch(vsHTML)
        if match == nil {
                http.Error(w, "Stream source unavailable for this title", http.StatusNotFound)
                return
        }
        cnToken := string(match[1])

        cnURL := "https://cloudnestra.com/rcp/" + cnToken
        cnHTML, _, err := fetchURL(cnURL, "", ua)
        if err != nil {
                http.Error(w, "Failed to load player: "+err.Error(), http.StatusBadGateway)
                return
        }

        cleanedHTML := proRcpRe.ReplaceAllStringFunc(string(cnHTML), func(match string) string {
                return "/api/cn-proxy?path=" + url.QueryEscape(match)
        })
        cleanedHTML = rewriteRelativeURLs(cleanedHTML, "https://cloudnestra.com")
        cleanedHTML = sbxScriptRe.ReplaceAllString(cleanedHTML, "")
        cleanedHTML = strings.Replace(cleanedHTML,
                "<head>",
                `<head><meta name="referrer" content="no-referrer-when-downgrade">`,
                1,
        )

        w.Header().Set("Content-Type", "text/html; charset=utf-8")
        w.Header().Set("X-Frame-Options", "SAMEORIGIN")
        w.Header().Set("Cache-Control", "no-cache")
        w.Write([]byte(cleanedHTML))
}

// CnProxy proxies cloudnestra.com resources, adding the correct Referer header.
// GET /api/cn-proxy?path=/prorcp/...
func CnProxy(w http.ResponseWriter, r *http.Request) {
        path := r.URL.Query().Get("path")
        if path == "" || !strings.HasPrefix(path, "/") {
                http.Error(w, "path param required", http.StatusBadRequest)
                return
        }

        targetURL := "https://cloudnestra.com" + path
        body, contentType, err := fetchURL(targetURL, "https://cloudnestra.com/", ua)
        if err != nil {
                http.Error(w, "Proxy error: "+err.Error(), http.StatusBadGateway)
                return
        }

        if strings.Contains(contentType, "text/html") {
                html := string(body)
                html = rewriteRelativeURLs(html, "https://cloudnestra.com")
                html = proRcpRe.ReplaceAllStringFunc(html, func(match string) string {
                        return "/api/cn-proxy?path=" + url.QueryEscape(match)
                })
                html = sbxScriptRe.ReplaceAllString(html, "")
                body = []byte(html)
        }

        if contentType != "" {
                w.Header().Set("Content-Type", contentType)
        }
        w.Header().Set("Cache-Control", "no-cache")
        w.Write(body)
}
