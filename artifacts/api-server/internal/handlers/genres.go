package handlers

import (
        "blasce-api/internal/db"
        "blasce-api/internal/models"
        "net/http"
)

func ListGenres(w http.ResponseWriter, r *http.Request) {
        rows, err := db.DB.Query(`
                SELECT DISTINCT g.id, g.name, g.slug, g.icon_url
                FROM genres g
                INNER JOIN content_genres cg ON cg.genre_id = g.id
                ORDER BY g.name ASC
        `)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }
        defer rows.Close()

        var genres []models.Genre
        for rows.Next() {
                var g models.Genre
                if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.IconURL); err != nil {
                        writeError(w, http.StatusInternalServerError, err.Error())
                        return
                }
                genres = append(genres, g)
        }
        if genres == nil {
                genres = []models.Genre{}
        }

        jsonResponse(w, http.StatusOK, models.GenreListResponse{Genres: genres})
}
