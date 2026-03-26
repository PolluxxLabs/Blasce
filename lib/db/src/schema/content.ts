import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const contentTable = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'movie' | 'tv'
  description: text("description").notNull(),
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  trailerUrl: text("trailer_url"),
  releaseYear: integer("release_year").notNull(),
  rating: text("rating").notNull().default("PG-13"),
  imdbScore: real("imdb_score"),
  rtScore: integer("rt_score"),
  duration: integer("duration"), // minutes for movies
  featured: boolean("featured").notNull().default(false),
  trending: boolean("trending").notNull().default(false),
  trendingRank: integer("trending_rank"),
  seasons: integer("seasons"), // for TV
  totalEpisodes: integer("total_episodes"), // for TV
  createdAt: timestamp("created_at").defaultNow(),
});

export const genresTable = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  iconUrl: text("icon_url"),
});

export const contentGenresTable = pgTable("content_genres", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id, { onDelete: "cascade" }),
  genreId: integer("genre_id").notNull().references(() => genresTable.id, { onDelete: "cascade" }),
});

export const castTable = pgTable("cast", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  character: text("character").notNull(),
  photoUrl: text("photo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const episodesTable = pgTable("episodes", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id, { onDelete: "cascade" }),
  season: integer("season").notNull(),
  episode: integer("episode").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  duration: integer("duration").notNull(), // minutes
  thumbnailUrl: text("thumbnail_url"),
});

export const watchlistTable = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull().references(() => contentTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const insertContentSchema = createInsertSchema(contentTable).omit({ id: true, createdAt: true });
export const insertGenreSchema = createInsertSchema(genresTable).omit({ id: true });
export const insertCastSchema = createInsertSchema(castTable).omit({ id: true });
export const insertEpisodeSchema = createInsertSchema(episodesTable).omit({ id: true });
export const insertWatchlistSchema = createInsertSchema(watchlistTable).omit({ id: true, addedAt: true });

export type Content = typeof contentTable.$inferSelect;
export type Genre = typeof genresTable.$inferSelect;
export type CastMember = typeof castTable.$inferSelect;
export type Episode = typeof episodesTable.$inferSelect;
export type WatchlistItem = typeof watchlistTable.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type InsertGenre = z.infer<typeof insertGenreSchema>;
