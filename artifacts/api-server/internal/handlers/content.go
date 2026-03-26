package handlers

import (
        "blasce-api/internal/db"
        "blasce-api/internal/models"
        "database/sql"
        "fmt"
        "net/http"
        "strconv"
        "strings"

        "github.com/go-chi/chi/v5"
)

func GetTopRated(w http.ResponseWriter, r *http.Request) {
        limitStr := r.URL.Query().Get("limit")
        limit := 12
        if limitStr != "" {
                if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
                        limit = n
                }
        }
        contentType := r.URL.Query().Get("type")

        var args []any
        argIdx := 1
        where := ""
        if contentType == "movie" || contentType == "tv" {
                where = fmt.Sprintf("WHERE type = $%d", argIdx)
                args = append(args, contentType)
                argIdx++
        }
        args = append(args, limit)

        query := fmt.Sprintf(`SELECT %s FROM content %s ORDER BY imdb_score DESC NULLS LAST, id ASC LIMIT $%d`,
                contentSelectCols, where, argIdx)
        rows, err := db.DB.Query(query, args...)
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

func GetNewReleases(w http.ResponseWriter, r *http.Request) {
        limitStr := r.URL.Query().Get("limit")
        limit := 12
        if limitStr != "" {
                if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
                        limit = n
                }
        }
        contentType := r.URL.Query().Get("type")

        var args []any
        argIdx := 1
        where := ""
        if contentType == "movie" || contentType == "tv" {
                where = fmt.Sprintf("WHERE type = $%d", argIdx)
                args = append(args, contentType)
                argIdx++
        }
        args = append(args, limit)

        query := fmt.Sprintf(`SELECT %s FROM content %s ORDER BY release_year DESC, id ASC LIMIT $%d`,
                contentSelectCols, where, argIdx)
        rows, err := db.DB.Query(query, args...)
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

func GetFeaturedHero(w http.ResponseWriter, r *http.Request) {
        query := fmt.Sprintf(`SELECT %s FROM content WHERE featured = true ORDER BY RANDOM() LIMIT 1`, contentSelectCols)
        row := db.DB.QueryRow(query)
        c, err := scanContent(row)
        if err == sql.ErrNoRows {
                writeError(w, http.StatusNotFound, "No featured content found")
                return
        }
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        c, err = enrichContent(c)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        cast, err := getCastForContent(c.ID)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        jsonResponse(w, http.StatusOK, models.ContentDetail{Content: c, Cast: cast, Episodes: []models.Episode{}})
}

func GetTrending(w http.ResponseWriter, r *http.Request) {
        limitStr := r.URL.Query().Get("limit")
        limit := 10
        if limitStr != "" {
                if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
                        limit = n
                }
        }

        query := fmt.Sprintf(`SELECT %s FROM content WHERE trending = true ORDER BY trending_rank ASC NULLS LAST LIMIT $1`, contentSelectCols)
        rows, err := db.DB.Query(query, limit)
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

func ListContent(w http.ResponseWriter, r *http.Request) {
        q := r.URL.Query()
        contentType := q.Get("type")
        genre := q.Get("genre")
        search := q.Get("search")
        featured := q.Get("featured")
        sort := q.Get("sort")

        limitStr := q.Get("limit")
        offsetStr := q.Get("offset")
        limit := 20
        offset := 0
        if limitStr != "" {
                if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
                        limit = n
                }
        }
        if offsetStr != "" {
                if n, err := strconv.Atoi(offsetStr); err == nil && n >= 0 {
                        offset = n
                }
        }

        var conditions []string
        var args []any
        argIdx := 1

        if contentType == "movie" || contentType == "tv" {
                conditions = append(conditions, fmt.Sprintf("c.type = $%d", argIdx))
                args = append(args, contentType)
                argIdx++
        }

        if search != "" {
                conditions = append(conditions, fmt.Sprintf("c.title ILIKE $%d", argIdx))
                args = append(args, "%"+search+"%")
                argIdx++
        }

        if featured == "true" {
                conditions = append(conditions, "c.featured = true")
        }

        if genre != "" {
                conditions = append(conditions, fmt.Sprintf(
                        `EXISTS (SELECT 1 FROM content_genres cg2 INNER JOIN genres g2 ON cg2.genre_id = g2.id WHERE cg2.content_id = c.id AND g2.slug = $%d)`,
                        argIdx,
                ))
                args = append(args, genre)
                argIdx++
        }

        whereClause := ""
        if len(conditions) > 0 {
                whereClause = "WHERE " + strings.Join(conditions, " AND ")
        }

        countQuery := fmt.Sprintf("SELECT COUNT(*) FROM content c %s", whereClause)
        var total int
        if err := db.DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        orderBy := "c.trending DESC, c.featured DESC, c.release_year DESC"
        switch sort {
        case "newest":
                orderBy = "c.release_year DESC, c.id DESC"
        case "oldest":
                orderBy = "c.release_year ASC, c.id ASC"
        case "rating":
                orderBy = "c.imdb_score DESC NULLS LAST, c.id ASC"
        case "title":
                orderBy = "c.title ASC"
        }

        mainQuery := fmt.Sprintf(`
                SELECT %s FROM content c
                %s
                ORDER BY %s
                LIMIT $%d OFFSET $%d
        `, contentSelectCols, whereClause, orderBy, argIdx, argIdx+1)

        args = append(args, limit, offset)
        rows, err := db.DB.Query(mainQuery, args...)
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

        jsonResponse(w, http.StatusOK, models.ContentListResponse{Items: items, Total: total})
}

func GetContent(w http.ResponseWriter, r *http.Request) {
        idStr := chi.URLParam(r, "id")
        id, err := strconv.Atoi(idStr)
        if err != nil {
                writeError(w, http.StatusBadRequest, "Invalid ID")
                return
        }

        query := fmt.Sprintf(`SELECT %s FROM content WHERE id = $1`, contentSelectCols)
        row := db.DB.QueryRow(query, id)
        c, err := scanContent(row)
        if err == sql.ErrNoRows {
                writeError(w, http.StatusNotFound, "Content not found")
                return
        }
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        c, err = enrichContent(c)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        cast, err := getCastForContent(id)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        episodes, err := getEpisodesForContent(id)
        if err != nil {
                writeError(w, http.StatusInternalServerError, err.Error())
                return
        }

        jsonResponse(w, http.StatusOK, models.ContentDetail{Content: c, Cast: cast, Episodes: episodes})
}

func getCastForContent(contentID int) ([]models.CastMember, error) {
        rows, err := db.DB.Query(`
                SELECT name, character, photo_url FROM "cast"
                WHERE content_id = $1
                ORDER BY sort_order ASC
        `, contentID)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var cast []models.CastMember
        for rows.Next() {
                var m models.CastMember
                if err := rows.Scan(&m.Name, &m.Character, &m.PhotoURL); err != nil {
                        return nil, err
                }
                cast = append(cast, m)
        }
        if cast == nil {
                cast = []models.CastMember{}
        }
        return cast, nil
}

func getEpisodesForContent(contentID int) ([]models.Episode, error) {
        rows, err := db.DB.Query(`
                SELECT id, season, episode, title, description, duration, thumbnail_url FROM episodes
                WHERE content_id = $1
                ORDER BY season ASC, episode ASC
        `, contentID)
        if err != nil {
                return nil, err
        }
        defer rows.Close()

        var episodes []models.Episode
        for rows.Next() {
                var e models.Episode
                if err := rows.Scan(&e.ID, &e.Season, &e.Episode, &e.Title, &e.Description, &e.Duration, &e.ThumbnailURL); err != nil {
                        return nil, err
                }
                episodes = append(episodes, e)
        }
        if episodes == nil {
                episodes = []models.Episode{}
        }
        return episodes, nil
}
