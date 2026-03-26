package handlers

import (
        "blasce-api/internal/db"
        "blasce-api/internal/middleware"
        "blasce-api/internal/models"
        "encoding/json"
        "net/http"
        "strconv"

        "github.com/go-chi/chi/v5"
)

func GetWatchlist(w http.ResponseWriter, r *http.Request) {
        userID := middleware.GetUserID(r.Context())

        rows, err := db.DB.Query(`
                SELECT c.id, c.title, c.type, c.description,
                       c.poster_url, c.backdrop_url, c.trailer_url,
                       c.release_year, c.rating, c.imdb_score, c.rt_score, c.duration,
                       c.featured, c.trending, c.trending_rank,
                       c.seasons, c.total_episodes
                FROM content c
                INNER JOIN watchlist wl ON wl.content_id = c.id
                WHERE wl.user_id = $1
                ORDER BY wl.added_at ASC
        `, userID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }
        defer rows.Close()

        var items []models.Content
        for rows.Next() {
                c, err := scanContent(rows)
                if err != nil {
                        writeError(w, http.StatusInternalServerError, err.Error())
                        return
                }
                c, err = enrichContent(c)
                if err != nil {
                        writeError(w, http.StatusInternalServerError, err.Error())
                        return
                }
                items = append(items, c)
        }
        if items == nil {
                items = []models.Content{}
        }

        jsonResponse(w, http.StatusOK, models.ContentListResponse{Items: items, Total: len(items)})
}

func AddToWatchlist(w http.ResponseWriter, r *http.Request) {
        userID := middleware.GetUserID(r.Context())

        var body struct {
                ContentID int `json:"contentId"`
        }
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
                writeError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if body.ContentID == 0 {
                writeError(w, http.StatusBadRequest, "contentId is required")
                return
        }

        var existing models.WatchlistItem
        err := db.DB.QueryRow(`
                SELECT id, content_id, user_id, added_at FROM watchlist
                WHERE content_id = $1 AND user_id = $2
        `, body.ContentID, userID).Scan(
                &existing.ID, &existing.ContentID, &existing.UserID, &existing.AddedAt,
        )
        if err == nil {
                jsonResponse(w, http.StatusOK, existing)
                return
        }

        var item models.WatchlistItem
        err = db.DB.QueryRow(`
                INSERT INTO watchlist (content_id, user_id)
                VALUES ($1, $2)
                RETURNING id, content_id, user_id, added_at
        `, body.ContentID, userID).Scan(
                &item.ID, &item.ContentID, &item.UserID, &item.AddedAt,
        )
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        jsonResponse(w, http.StatusOK, item)
}

func RemoveFromWatchlist(w http.ResponseWriter, r *http.Request) {
        userID := middleware.GetUserID(r.Context())

        contentIDStr := chi.URLParam(r, "contentId")
        contentID, err := strconv.Atoi(contentIDStr)
        if err != nil {
                writeError(w, http.StatusBadRequest, "Invalid contentId")
                return
        }

        _, err = db.DB.Exec(`DELETE FROM watchlist WHERE content_id = $1 AND user_id = $2`, contentID, userID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        jsonResponse(w, http.StatusOK, map[string]bool{"success": true})
}
