package main

import (
        "blasce-api/internal/db"
        "blasce-api/internal/handlers"
        "fmt"
        "log"
        "net/http"
        "os"

        "github.com/go-chi/chi/v5"
        "github.com/go-chi/chi/v5/middleware"
        "github.com/rs/cors"
)

func main() {
        port := os.Getenv("PORT")
        if port == "" {
                log.Fatal("PORT environment variable is required")
        }

        if err := db.Connect(); err != nil {
                log.Fatalf("Failed to connect to database: %v", err)
        }
        log.Println("Connected to PostgreSQL database")

        r := chi.NewRouter()
        r.Use(middleware.Logger)
        r.Use(middleware.Recoverer)
        r.Use(cors.New(cors.Options{
                AllowedOrigins:   []string{"*"},
                AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
                AllowedHeaders:   []string{"*"},
                AllowCredentials: false,
        }).Handler)

        r.Route("/api", func(r chi.Router) {
                r.Get("/healthz", handlers.HealthCheck)
                r.Route("/content", func(r chi.Router) {
                        r.Get("/featured/hero", handlers.GetFeaturedHero)
                        r.Get("/trending/now", handlers.GetTrending)
                        r.Get("/top-rated", handlers.GetTopRated)
                        r.Get("/new-releases", handlers.GetNewReleases)
                        r.Get("/", handlers.ListContent)
                        r.Get("/{id}", handlers.GetContent)
                })
                r.Get("/genres", handlers.ListGenres)
                r.Route("/watchlist", func(r chi.Router) {
                        r.Get("/", handlers.GetWatchlist)
                        r.Post("/", handlers.AddToWatchlist)
                        r.Delete("/{contentId}", handlers.RemoveFromWatchlist)
                })
        })

        addr := fmt.Sprintf(":%s", port)
        log.Printf("Go server listening on port %s", port)
        if err := http.ListenAndServe(addr, r); err != nil {
                log.Fatalf("Server failed: %v", err)
        }
}
