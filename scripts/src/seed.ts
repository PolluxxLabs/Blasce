import { db } from "@workspace/db";
import {
  contentTable,
  genresTable,
  contentGenresTable,
  castTable,
  episodesTable,
  watchlistTable,
} from "@workspace/db/schema";

const genres = [
  { name: "Action", slug: "action" },
  { name: "Adventure", slug: "adventure" },
  { name: "Animation", slug: "animation" },
  { name: "Comedy", slug: "comedy" },
  { name: "Crime", slug: "crime" },
  { name: "Documentary", slug: "documentary" },
  { name: "Drama", slug: "drama" },
  { name: "Fantasy", slug: "fantasy" },
  { name: "Horror", slug: "horror" },
  { name: "Mystery", slug: "mystery" },
  { name: "Romance", slug: "romance" },
  { name: "Sci-Fi", slug: "sci-fi" },
  { name: "Thriller", slug: "thriller" },
  { name: "Western", slug: "western" },
];

const contentData = [
  // Movies
  {
    title: "Inception",
    type: "movie" as const,
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O., but his tragic past may doom the project and his team to disaster.",
    posterUrl: "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    trailerUrl: "YoHD9XEInc0",
    releaseYear: 2010,
    rating: "PG-13",
    imdbScore: 8.8,
    duration: 148,
    featured: true,
    trending: true,
    trendingRank: 1,
    genres: ["action", "sci-fi", "thriller"],
    cast: [
      { name: "Leonardo DiCaprio", character: "Dom Cobb", sortOrder: 0 },
      { name: "Joseph Gordon-Levitt", character: "Arthur", sortOrder: 1 },
      { name: "Elliot Page", character: "Ariadne", sortOrder: 2 },
      { name: "Tom Hardy", character: "Eames", sortOrder: 3 },
    ],
  },
  {
    title: "The Dark Knight",
    type: "movie" as const,
    description:
      "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    posterUrl: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CejMQhaQ.jpg",
    trailerUrl: "EXeTwQWrcwY",
    releaseYear: 2008,
    rating: "PG-13",
    imdbScore: 9.0,
    duration: 152,
    featured: true,
    trending: true,
    trendingRank: 2,
    genres: ["action", "crime", "drama"],
    cast: [
      { name: "Christian Bale", character: "Bruce Wayne / Batman", sortOrder: 0 },
      { name: "Heath Ledger", character: "The Joker", sortOrder: 1 },
      { name: "Aaron Eckhart", character: "Harvey Dent", sortOrder: 2 },
      { name: "Maggie Gyllenhaal", character: "Rachel Dawes", sortOrder: 3 },
    ],
  },
  {
    title: "Interstellar",
    type: "movie" as const,
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival. A visually stunning and emotionally gripping odyssey through the stars.",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/pbrkL804c8yAv3zBZR4QPEafpAR.jpg",
    trailerUrl: "zSWdZVtXT7E",
    releaseYear: 2014,
    rating: "PG-13",
    imdbScore: 8.6,
    duration: 169,
    featured: true,
    trending: true,
    trendingRank: 3,
    genres: ["adventure", "drama", "sci-fi"],
    cast: [
      { name: "Matthew McConaughey", character: "Cooper", sortOrder: 0 },
      { name: "Anne Hathaway", character: "Brand", sortOrder: 1 },
      { name: "Jessica Chastain", character: "Murph", sortOrder: 2 },
      { name: "Michael Caine", character: "Professor Brand", sortOrder: 3 },
    ],
  },
  {
    title: "Dune",
    type: "movie" as const,
    description:
      "Feature adaptation of Frank Herbert's science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset and most vital element in the galaxy.",
    posterUrl: "https://image.tmdb.org/t/p/w500/d5NXSklpcvkmXnwvKLz5iz3lMFl.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/iopYFB1b6Bh7FWZh3onQhph1sih.jpg",
    trailerUrl: "8g18jFHCLXk",
    releaseYear: 2021,
    rating: "PG-13",
    imdbScore: 8.0,
    duration: 155,
    featured: false,
    trending: true,
    trendingRank: 4,
    genres: ["action", "adventure", "drama", "sci-fi"],
    cast: [
      { name: "Timothée Chalamet", character: "Paul Atreides", sortOrder: 0 },
      { name: "Rebecca Ferguson", character: "Lady Jessica", sortOrder: 1 },
      { name: "Zendaya", character: "Chani", sortOrder: 2 },
      { name: "Oscar Isaac", character: "Duke Leto Atreides", sortOrder: 3 },
    ],
  },
  {
    title: "Everything Everywhere All at Once",
    type: "movie" as const,
    description:
      "An aging Chinese immigrant is swept up in an insane adventure, in which she alone can save what's important to her by connecting with the lives she could have led in other universes.",
    posterUrl: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/4Y1WNkd88JXmGfhtWR7dmDAo1T2.jpg",
    trailerUrl: "wxN1T1uxQ2g",
    releaseYear: 2022,
    rating: "R",
    imdbScore: 7.8,
    duration: 139,
    featured: false,
    trending: true,
    trendingRank: 5,
    genres: ["action", "adventure", "comedy", "sci-fi"],
    cast: [
      { name: "Michelle Yeoh", character: "Evelyn Wang", sortOrder: 0 },
      { name: "Ke Huy Quan", character: "Waymond Wang", sortOrder: 1 },
      { name: "Stephanie Hsu", character: "Joy Wang", sortOrder: 2 },
      { name: "Jamie Lee Curtis", character: "Deirdre Beaubeirdra", sortOrder: 3 },
    ],
  },
  {
    title: "Oppenheimer",
    type: "movie" as const,
    description:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II. A breathtaking saga of science, morality, and consequence.",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
    trailerUrl: "uYPbbksJxIg",
    releaseYear: 2023,
    rating: "R",
    imdbScore: 8.3,
    duration: 180,
    featured: true,
    trending: false,
    trendingRank: null,
    genres: ["drama", "thriller", "mystery"],
    cast: [
      { name: "Cillian Murphy", character: "J. Robert Oppenheimer", sortOrder: 0 },
      { name: "Emily Blunt", character: "Katherine Oppenheimer", sortOrder: 1 },
      { name: "Matt Damon", character: "Leslie Groves", sortOrder: 2 },
      { name: "Robert Downey Jr.", character: "Lewis Strauss", sortOrder: 3 },
    ],
  },
  {
    title: "Parasite",
    type: "movie" as const,
    description:
      "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan. A masterpiece of modern cinema.",
    posterUrl: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg",
    trailerUrl: "5xH0HfJHsaY",
    releaseYear: 2019,
    rating: "R",
    imdbScore: 8.5,
    duration: 132,
    featured: false,
    trending: false,
    trendingRank: null,
    genres: ["comedy", "drama", "thriller"],
    cast: [
      { name: "Song Kang-ho", character: "Ki-taek", sortOrder: 0 },
      { name: "Lee Sun-kyun", character: "Park Dong-ik", sortOrder: 1 },
      { name: "Cho Yeo-jeong", character: "Park Yeon-kyo", sortOrder: 2 },
      { name: "Choi Woo-shik", character: "Ki-woo", sortOrder: 3 },
    ],
  },
  {
    title: "The Shawshank Redemption",
    type: "movie" as const,
    description:
      "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency. One of cinema's most beloved stories of hope.",
    posterUrl: "https://image.tmdb.org/t/p/w500/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/avedvodAZUcwqevBfm8p4G2NziQ.jpg",
    trailerUrl: "6hB3S9bIaco",
    releaseYear: 1994,
    rating: "R",
    imdbScore: 9.3,
    duration: 142,
    featured: false,
    trending: false,
    trendingRank: null,
    genres: ["drama"],
    cast: [
      { name: "Tim Robbins", character: "Andy Dufresne", sortOrder: 0 },
      { name: "Morgan Freeman", character: "Ellis Boyd Redding", sortOrder: 1 },
      { name: "Bob Gunton", character: "Warden Norton", sortOrder: 2 },
    ],
  },
  {
    title: "Avengers: Endgame",
    type: "movie" as const,
    description:
      "After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos' actions and restore balance to the universe.",
    posterUrl: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg",
    trailerUrl: "TcMBFSGVi1c",
    releaseYear: 2019,
    rating: "PG-13",
    imdbScore: 8.4,
    duration: 181,
    featured: false,
    trending: false,
    trendingRank: null,
    genres: ["action", "adventure", "sci-fi"],
    cast: [
      { name: "Robert Downey Jr.", character: "Tony Stark / Iron Man", sortOrder: 0 },
      { name: "Chris Evans", character: "Steve Rogers / Captain America", sortOrder: 1 },
      { name: "Scarlett Johansson", character: "Natasha Romanoff", sortOrder: 2 },
      { name: "Josh Brolin", character: "Thanos", sortOrder: 3 },
    ],
  },
  {
    title: "Mad Max: Fury Road",
    type: "movie" as const,
    description:
      "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners and a drifter named Max.",
    posterUrl: "https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/phszHPFnhmMBF6TaqLi5OyGrSKm.jpg",
    trailerUrl: "hEJnMQG9ev8",
    releaseYear: 2015,
    rating: "R",
    imdbScore: 8.1,
    duration: 120,
    featured: false,
    trending: false,
    trendingRank: null,
    genres: ["action", "adventure", "thriller"],
    cast: [
      { name: "Tom Hardy", character: "Max Rockatansky", sortOrder: 0 },
      { name: "Charlize Theron", character: "Imperator Furiosa", sortOrder: 1 },
      { name: "Nicholas Hoult", character: "Nux", sortOrder: 2 },
    ],
  },
  // TV Shows
  {
    title: "Breaking Bad",
    type: "tv" as const,
    description:
      "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
    posterUrl: "https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg",
    trailerUrl: "HhesaQXLuRY",
    releaseYear: 2008,
    rating: "TV-MA",
    imdbScore: 9.5,
    duration: null,
    featured: true,
    trending: true,
    trendingRank: 6,
    seasons: 5,
    totalEpisodes: 62,
    genres: ["crime", "drama", "thriller"],
    cast: [
      { name: "Bryan Cranston", character: "Walter White", sortOrder: 0 },
      { name: "Aaron Paul", character: "Jesse Pinkman", sortOrder: 1 },
      { name: "Anna Gunn", character: "Skyler White", sortOrder: 2 },
      { name: "Dean Norris", character: "Hank Schrader", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "Pilot", description: "Walter White, a struggling high school chemistry teacher, is diagnosed with inoperable lung cancer.", duration: 58 },
      { season: 1, episode: 2, title: "Cat's in the Bag", description: "Walt and Jesse attempt to dispose of the bodies left from their encounter with Emilio and Krazy-8.", duration: 48 },
      { season: 1, episode: 3, title: "...And the Bag's in the River", description: "Walt struggles with the consequences of his choices.", duration: 48 },
      { season: 1, episode: 4, title: "Cancer Man", description: "Walt reveals his cancer diagnosis to his family.", duration: 48 },
      { season: 2, episode: 1, title: "Seven Thirty-Seven", description: "Walt and Jesse meet the feared drug distributor Tuco.", duration: 48 },
      { season: 2, episode: 2, title: "Grilled", description: "Walt and Jesse are held captive by Tuco.", duration: 48 },
    ],
  },
  {
    title: "Stranger Things",
    type: "tv" as const,
    description:
      "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.",
    posterUrl: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    trailerUrl: "b9EkMc79ZSU",
    releaseYear: 2016,
    rating: "TV-14",
    imdbScore: 8.7,
    duration: null,
    featured: true,
    trending: true,
    trendingRank: 7,
    seasons: 4,
    totalEpisodes: 34,
    genres: ["drama", "fantasy", "horror", "mystery", "sci-fi"],
    cast: [
      { name: "Millie Bobby Brown", character: "Eleven", sortOrder: 0 },
      { name: "Finn Wolfhard", character: "Mike Wheeler", sortOrder: 1 },
      { name: "Winona Ryder", character: "Joyce Byers", sortOrder: 2 },
      { name: "David Harbour", character: "Jim Hopper", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "The Vanishing of Will Byers", description: "On his way home from a friend's house, young Will sees something terrifying.", duration: 47 },
      { season: 1, episode: 2, title: "The Weirdo on Maple Street", description: "Lucas, Mike and Dustin try to talk to the girl they found in the woods.", duration: 55 },
      { season: 1, episode: 3, title: "Holly, Jolly", description: "An increasingly concerned Joyce believes Will is trying to communicate with her.", duration: 51 },
      { season: 2, episode: 1, title: "MADMAX", description: "As the town preps for Halloween, a high-scoring video game player is the talk of the arcade.", duration: 48 },
      { season: 2, episode: 2, title: "Trick or Treat, Freak", description: "After Will sees something terrible on Halloween, Mike wonders whether Eleven was right.", duration: 56 },
    ],
  },
  {
    title: "The Last of Us",
    type: "tv" as const,
    description:
      "After a global catastrophe, a hardened survivor and a teenage girl must traverse a dangerous post-apocalyptic America. A harrowing journey of survival, love, and loss.",
    posterUrl: "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/uDgy6hyPd82kx2mLYzIAaLQNhW3.jpg",
    trailerUrl: "uLtkt72keat",
    releaseYear: 2023,
    rating: "TV-MA",
    imdbScore: 8.8,
    duration: null,
    featured: true,
    trending: true,
    trendingRank: 8,
    seasons: 2,
    totalEpisodes: 18,
    genres: ["action", "adventure", "drama", "thriller"],
    cast: [
      { name: "Pedro Pascal", character: "Joel Miller", sortOrder: 0 },
      { name: "Bella Ramsey", character: "Ellie Williams", sortOrder: 1 },
      { name: "Anna Torv", character: "Tess", sortOrder: 2 },
      { name: "Gabriel Luna", character: "Tommy Miller", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "When You're Lost in the Darkness", description: "Twenty years after a fungal outbreak devastates civilization, survivor Joel is hired to smuggle a teenager out of a quarantine zone.", duration: 81 },
      { season: 1, episode: 2, title: "Infected", description: "Joel, Tess and Ellie evade authorities in Boston, navigating through dangerous clicker-infested territory.", duration: 57 },
      { season: 1, episode: 3, title: "Long Long Time", description: "Joel and Ellie encounter a survivalist hiding a heartfelt secret.", duration: 76 },
      { season: 1, episode: 4, title: "Please Hold to My Hand", description: "Joel and Ellie arrive in Kansas City, where a vengeful leader has replaced the government.", duration: 48 },
      { season: 1, episode: 5, title: "Endure and Survive", description: "Kathleen hunts for a wanted man while Joel and Ellie must survive an ambush.", duration: 58 },
      { season: 2, episode: 1, title: "Future Days", description: "Years after the events of Season 1, Ellie and Joel navigate their new life in Jackson.", duration: 60 },
    ],
  },
  {
    title: "House of the Dragon",
    type: "tv" as const,
    description:
      "The story of House Targaryen set 200 years before the events of Game of Thrones, chronicling the Targaryen civil war known as the Dance of the Dragons.",
    posterUrl: "https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg",
    trailerUrl: "DotnJ7tTA34",
    releaseYear: 2022,
    rating: "TV-MA",
    imdbScore: 8.4,
    duration: null,
    featured: false,
    trending: true,
    trendingRank: 9,
    seasons: 2,
    totalEpisodes: 18,
    genres: ["action", "adventure", "drama", "fantasy"],
    cast: [
      { name: "Paddy Considine", character: "King Viserys I Targaryen", sortOrder: 0 },
      { name: "Matt Smith", character: "Daemon Targaryen", sortOrder: 1 },
      { name: "Olivia Cooke", character: "Alicent Hightower", sortOrder: 2 },
      { name: "Emma D'Arcy", character: "Rhaenyra Targaryen", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "The Heirs of the Dragon", description: "Viserys hosts a tournament to celebrate the birth of his second child.", duration: 66 },
      { season: 1, episode: 2, title: "The Rogue Prince", description: "Rhaenyra defends the Targaryen succession while Daemon makes a power play.", duration: 54 },
      { season: 1, episode: 3, title: "Second of His Name", description: "Daemon and the Sea Snake battle the Crabfeeder's forces in the Stepstones.", duration: 63 },
    ],
  },
  {
    title: "The Bear",
    type: "tv" as const,
    description:
      "A young chef from the fine dining world returns to Chicago to run his family's Italian beef sandwich shop after a tragedy. A raw and intense portrait of kitchen life.",
    posterUrl: "https://image.tmdb.org/t/p/w500/sHFlbKS3WLqMnp9t2ghADIJFnuQ.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/51cwBn1yoYpzniY4UNJyVkqXGJf.jpg",
    trailerUrl: "oVJSMnWbhXE",
    releaseYear: 2022,
    rating: "TV-MA",
    imdbScore: 8.7,
    duration: null,
    featured: false,
    trending: true,
    trendingRank: 10,
    seasons: 3,
    totalEpisodes: 28,
    genres: ["comedy", "drama"],
    cast: [
      { name: "Jeremy Allen White", character: "Carmen 'Carmy' Berzatto", sortOrder: 0 },
      { name: "Ebon Moss-Bachrach", character: "Richard 'Richie' Jerimovich", sortOrder: 1 },
      { name: "Ayo Edebiri", character: "Sydney Adamu", sortOrder: 2 },
      { name: "Lionel Boyce", character: "Marcus Brooks", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "System", description: "Carmen 'Carmy' Berzatto takes over his family's Chicago restaurant.", duration: 35 },
      { season: 1, episode: 2, title: "Hands", description: "Carmy tries to implement his fine dining training in the sandwich shop.", duration: 32 },
      { season: 1, episode: 3, title: "Brigade", description: "When the fridge breaks down, it sends the whole kitchen into chaos.", duration: 30 },
      { season: 2, episode: 1, title: "Beef", description: "The team works to transform the restaurant into a fine dining establishment.", duration: 52 },
      { season: 2, episode: 2, title: "Pasta", description: "Marcus goes to Copenhagen to stage at a world-class restaurant.", duration: 30 },
    ],
  },
  {
    title: "Succession",
    type: "tv" as const,
    description:
      "The Roy family is known for controlling the biggest media and entertainment company in the world. But, who will take the reins when their aging patriarch steps down?",
    posterUrl: "https://image.tmdb.org/t/p/w500/e2X8NMd6f7g15FGkzTTBFLtFv2B.jpg",
    backdropUrl: "https://image.tmdb.org/t/p/original/1qLMSqBpRfMzuaG71cGhxAz9hYL.jpg",
    trailerUrl: "OzYxJV_rmE8",
    releaseYear: 2018,
    rating: "TV-MA",
    imdbScore: 8.8,
    duration: null,
    featured: false,
    trending: false,
    trendingRank: null,
    seasons: 4,
    totalEpisodes: 39,
    genres: ["comedy", "drama"],
    cast: [
      { name: "Brian Cox", character: "Logan Roy", sortOrder: 0 },
      { name: "Jeremy Strong", character: "Kendall Roy", sortOrder: 1 },
      { name: "Sarah Snook", character: "Siobhan Roy", sortOrder: 2 },
      { name: "Kieran Culkin", character: "Roman Roy", sortOrder: 3 },
    ],
    episodes: [
      { season: 1, episode: 1, title: "Celebration", description: "Logan Roy's 80th birthday sparks discussion about who will take over the family business.", duration: 58 },
      { season: 1, episode: 2, title: "Shit Show at the Fuck Factory", description: "The kids scramble to manage a crisis at one of Waystar's theme parks.", duration: 52 },
    ],
  },
];

async function seed() {
  console.log("🌱 Starting seed...");

  // Clear existing data
  await db.delete(episodesTable);
  await db.delete(castTable);
  await db.delete(contentGenresTable);
  await db.delete(watchlistTable);
  await db.delete(contentTable);
  await db.delete(genresTable);

  console.log("📝 Inserting genres...");
  const insertedGenres = await db.insert(genresTable).values(genres).returning();
  const genreMap = new Map(insertedGenres.map((g) => [g.slug, g.id]));

  console.log("🎬 Inserting content...");
  for (const item of contentData) {
    const { genres: itemGenres, cast, episodes, ...contentFields } = item as any;

    const [inserted] = await db
      .insert(contentTable)
      .values(contentFields)
      .returning();

    // Insert genre associations
    for (const genreSlug of itemGenres) {
      const genreId = genreMap.get(genreSlug);
      if (genreId) {
        await db.insert(contentGenresTable).values({
          contentId: inserted.id,
          genreId,
        });
      }
    }

    // Insert cast
    if (cast) {
      await db.insert(castTable).values(
        cast.map((c: any) => ({ ...c, contentId: inserted.id }))
      );
    }

    // Insert episodes
    if (episodes && episodes.length > 0) {
      await db.insert(episodesTable).values(
        episodes.map((e: any) => ({ ...e, contentId: inserted.id }))
      );
    }

    console.log(`  ✅ ${inserted.title}`);
  }

  console.log("✨ Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
