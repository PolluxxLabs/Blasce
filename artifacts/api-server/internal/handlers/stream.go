package handlers

import (
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

const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

func rewriteRelativeURLs(html, baseURL string) string {
        return relSrcRe.ReplaceAllString(html, `$1=${2}`+baseURL+`/$3`)
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

        // Step 1: Build vsembed URL and fetch to get cloudnestra token
        var vsembedURL string
        if mediaType == "tv" {
                if season == "" {
                        season = "1"
                }
                if episode == "" {
                        episode = "1"
                }
                vsembedURL = fmt.Sprintf("https://vsembed.ru/embed/tv/%s/%s/%s/", imdbID, season, episode)
        } else {
                vsembedURL = fmt.Sprintf("https://vsembed.ru/embed/movie/%s/", imdbID)
        }

        vsHTML, _, err := fetchURL(vsembedURL, "https://vidsrc.to/", ua)
        if err != nil {
                http.Error(w, "Failed to resolve stream source: "+err.Error(), http.StatusBadGateway)
                return
        }

        // Step 2: Extract cloudnestra token
        match := cloudnestraTokenRe.FindSubmatch(vsHTML)
        if match == nil {
                http.Error(w, "Stream source unavailable for this title", http.StatusNotFound)
                return
        }
        cnToken := string(match[1])

        // Step 3: Fetch cloudnestra rcp page (no referer needed)
        cnURL := "https://cloudnestra.com/rcp/" + cnToken
        cnHTML, _, err := fetchURL(cnURL, "", ua)
        if err != nil {
                http.Error(w, "Failed to load player: "+err.Error(), http.StatusBadGateway)
                return
        }

        // Step 4: Clean the HTML
        // a) Rewrite /prorcp/{token} URLs to go through our cn-proxy (needs cloudnestra referer)
        cleanedHTML := proRcpRe.ReplaceAllStringFunc(string(cnHTML), func(match string) string {
                return "/api/cn-proxy?path=" + url.QueryEscape(match)
        })

        // b) Rewrite relative /path URLs to absolute cloudnestra.com URLs
        cleanedHTML = rewriteRelativeURLs(cleanedHTML, "https://cloudnestra.com")

        // c) Remove sbx.js (sandbox detection - would break our iframe)
        cleanedHTML = sbxScriptRe.ReplaceAllString(cleanedHTML, "")

        // d) Inject a meta tag so browser doesn't send a Referer (doesn't matter for rcp but safe)
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

        // For HTML responses, rewrite relative URLs and re-route any nested prorcp calls
        if strings.Contains(contentType, "text/html") {
                html := string(body)
                // Rewrite relative paths to absolute cloudnestra.com URLs
                html = rewriteRelativeURLs(html, "https://cloudnestra.com")
                // Rewrite any nested /prorcp/ references
                html = proRcpRe.ReplaceAllStringFunc(html, func(match string) string {
                        return "/api/cn-proxy?path=" + url.QueryEscape(match)
                })
                // Remove sbx.js
                html = sbxScriptRe.ReplaceAllString(html, "")
                body = []byte(html)
        }

        if contentType != "" {
                w.Header().Set("Content-Type", contentType)
        }
        w.Header().Set("Cache-Control", "no-cache")
        w.Write(body)
}
