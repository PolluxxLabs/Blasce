package handlers

import (
        "blasce-api/internal/db"
        "blasce-api/internal/models"
        "encoding/json"
        "net/http"
)

func jsonResponse(w http.ResponseWriter, status int, data any) {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(status)
        json.NewEncoder(w).Encode(data)
}

func getGenresForContent(contentID int) ([]string, error) {
        rows, err := db.DB.Query(`
                SELECT g.name FROM genres g
                INNER JOIN content_genres cg ON cg.genre_id = g.id
                WHERE cg.content_id = $1
                ORDER BY g.name
        `, contentID)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var genres []string
        for rows.Next() {
                var name string
                if err := rows.Scan(&name); err != nil {
                        return nil, err
                }
                genres = append(genres, name)
        }
        if genres == nil {
                genres = []string{}
        }
        return genres, nil
}

func scanContent(row interface {
        Scan(...any) error
}) (models.Content, error) {
        var c models.Content
        err := row.Scan(
                &c.ID, &c.Title, &c.Type, &c.Description,
                &c.PosterURL, &c.BackdropURL, &c.TrailerURL,
                &c.ReleaseYear, &c.Rating, &c.ImdbScore, &c.RtScore, &c.Duration,
                &c.Featured, &c.Trending, &c.TrendingRank,
                &c.Seasons, &c.TotalEpisodes, &c.StreamURL,
        )
        return c, err
}

func enrichContent(c models.Content) (models.Content, error) {
        genres, err := getGenresForContent(c.ID)
        if err != nil {
                return c, err
        }
        c.Genres = genres
        return c, nil
}

const contentSelectCols = `
        id, title, type, description,
        poster_url, backdrop_url, trailer_url,
        release_year, rating, imdb_score, rt_score, duration,
        featured, trending, trending_rank,
        seasons, total_episodes, stream_url
`

func writeError(w http.ResponseWriter, status int, msg string) {
        jsonResponse(w, status, map[string]string{"error": msg})
}
