package models

type Content struct {
        ID            int      `json:"id"`
        Title         string   `json:"title"`
        Type          string   `json:"type"`
        Description   string   `json:"description"`
        PosterURL     *string  `json:"posterUrl"`
        BackdropURL   *string  `json:"backdropUrl"`
        TrailerURL    *string  `json:"trailerUrl"`
        ReleaseYear   int      `json:"releaseYear"`
        Rating        string   `json:"rating"`
        ImdbScore     *float64 `json:"imdbScore"`
        RtScore       *int     `json:"rtScore"`
        Duration      *int     `json:"duration"`
        Featured      bool     `json:"featured"`
        Trending      bool     `json:"trending"`
        TrendingRank  *int     `json:"trendingRank"`
        Seasons       *int     `json:"seasons"`
        TotalEpisodes *int     `json:"totalEpisodes"`
        StreamURL     *string  `json:"streamUrl"`
        ImdbID        *string  `json:"imdbId"`
        Genres        []string `json:"genres"`
}

type ContentDetail struct {
        Content
        Cast     []CastMember `json:"cast"`
        Episodes []Episode    `json:"episodes"`
}

type CastMember struct {
        Name      string  `json:"name"`
        Character string  `json:"character"`
        PhotoURL  *string `json:"photoUrl"`
}

type Episode struct {
        ID           int     `json:"id"`
        Season       int     `json:"season"`
        Episode      int     `json:"episode"`
        Title        string  `json:"title"`
        Description  string  `json:"description"`
        Duration     int     `json:"duration"`
        ThumbnailURL *string `json:"thumbnailUrl"`
}

type Genre struct {
        ID      int     `json:"id"`
        Name    string  `json:"name"`
        Slug    string  `json:"slug"`
        IconURL *string `json:"iconUrl"`
}

type WatchlistItem struct {
        ID        int    `json:"id"`
        ContentID int    `json:"contentId"`
        UserID    string `json:"userId"`
        AddedAt   string `json:"addedAt"`
}

type ContentListResponse struct {
        Items []Content `json:"items"`
        Total int       `json:"total"`
}

type GenreListResponse struct {
        Genres []Genre `json:"genres"`
}
