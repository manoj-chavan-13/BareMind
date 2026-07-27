# BareMind — Search, Ranking & Personalization Architecture

> **Complete technical documentation of the intelligent search, real-time behavioral tracking, and ML-powered ranking system built for BareMind.**

---

## Table of Contents

1. [Overview & Design Philosophy](#overview--design-philosophy)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Core Components](#core-components)
   - [Meilisearch (Full-Text Search)](#1-meilisearch-full-text-search)
   - [Kafka (Event Streaming)](#2-kafka-event-streaming)
   - [Redis (In-Memory Data Store)](#3-redis-in-memory-data-store)
   - [Recommendation Engine (ML Ranking)](#4-recommendation-engine-ml-ranking)
5. [Data Flow: End-to-End Request Lifecycle](#data-flow-end-to-end-request-lifecycle)
   - [A. User Searches for Something](#a-user-searches-for-something)
   - [B. User Clicks a Blog Post](#b-user-clicks-a-blog-post)
   - [C. User Interacts (Like, Comment, Bookmark)](#c-user-interacts-like-comment-bookmark)
6. [Ranking Algorithm: How It Works](#ranking-algorithm-how-it-works)
   - [Step 1: Meilisearch Textual Relevance](#step-1-meilisearch-textual-relevance)
   - [Step 2: Global Trending Score Blend (Redis)](#step-2-global-trending-score-blend-redis)
   - [Step 3: Query-Specific Click Boost (Redis)](#step-3-query-specific-click-boost-redis)
   - [Step 4: Behavioral Personalization Multiplier](#step-4-behavioral-personalization-multiplier)
   - [Step 5: Time Decay (Gravity)](#step-5-time-decay-gravity)
   - [Step 6: Read-History Penalty (Feed Only)](#step-6-read-history-penalty-feed-only)
   - [Final Score Formula](#final-score-formula)
7. [Behavioral Tracking & Affinity Profiling](#behavioral-tracking--affinity-profiling)
   - [Interaction Weights](#interaction-weights)
   - [Affinity Vectors in Redis](#affinity-vectors-in-redis)
8. [Redis Key Schema](#redis-key-schema)
9. [Kafka Topic & Event Schema](#kafka-topic--event-schema)
10. [Key Files & Codebase Map](#key-files--codebase-map)
11. [Search Auto-Suggestions](#search-auto-suggestions)
12. [Design Decisions & Trade-offs](#design-decisions--trade-offs)
13. [Why We Removed SQL CASE Sorting](#why-we-removed-sql-case-sorting)

---

## Overview & Design Philosophy

BareMind's search and ranking system is built on **three non-negotiable principles**:

1. **Zero direct DB hits for ranking** — PostgreSQL is only used for fast indexed `IN (...)` lookups. All sorting, ranking, and scoring happens in-memory in Python using data from Redis and Meilisearch.
2. **Asynchronous telemetry** — Every interaction (view, like, comment, bookmark, search click) is offloaded to Kafka. The main API never blocks to process analytics.
3. **Real-time personalization** — The system builds a live behavioral profile per user in Redis. Every search result is re-ranked uniquely for that user, not for a generic crowd.

This system was built specifically to ensure:
- The **more you interact** with a specific type of content, the higher it ranks for you.
- The **exact post you click** after searching a keyword will surface at the top the next time you search that keyword.
- **Views are the most important signal** in global trending ranking.
- No hardcoded SQL queries, `CASE` statements, or static scoring logic.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               USER (Browser)                                    │
│                     Types query / opens post / likes post                       │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │ HTTP Request
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend (blogs.py / search.py / interactions.py)│
│                                                                                 │
│  1. Query Meilisearch for full-text relevance IDs                               │
│  2. Blend IDs with Redis trending & click scores (in-memory sort)               │
│  3. Paginate in Python (not DB)                                                 │
│  4. Fetch raw rows from PostgreSQL using IN (paginated_ids)                     │
│  5. Pass rows through ML ranking engine (recommendation.py)                     │
│  6. Publish telemetry event to Kafka (fire-and-forget, non-blocking)            │
└────┬─────────────────────┬──────────────────────┬──────────────────────────────┘
     │ IN (ids) lookup     │ zmscore lookup        │ Kafka publish
     ▼                     ▼                       ▼
┌─────────┐        ┌───────────────┐      ┌─────────────────────────────────────┐
│ PostgreSQL│       │ Redis          │      │ Kafka Topic: search_indexing         │
│ (Raw data)│       │ - trending:blogs│     │                                     │
│ (no sort) │       │ - search:query:│     │ Events: index, delete, query, click, │
└─────────┘        │   {q}:clicks  │      │ blog_view, blog_like, blog_comment,  │
                   │ - user:*:affinity│    │ blog_bookmark                        │
                   │ - user:*:history│    └──────────────────┬──────────────────┘
                   └───────────────┘                         │
                                                             ▼
                                              ┌─────────────────────────────┐
                                              │ SearchConsumer Worker        │
                                              │ (search_consumer.py)         │
                                              │                              │
                                              │ Processes each event:        │
                                              │ - Updates Redis stats        │
                                              │ - Updates trending sorted set│
                                              │ - Updates user affinity vecs │
                                              │ - Indexes doc in Meilisearch │
                                              └─────────────────────────────┘
```

---

## Technology Stack

| Technology | Role |
|---|---|
| **Meilisearch** | Full-text fuzzy search engine. Returns ordered IDs by textual relevance. |
| **Apache Kafka** | Distributed event streaming. Decouples telemetry from API request cycle. |
| **Redis** | In-memory data store for all ML signals: trending scores, click history, user affinity vectors, viewed history. |
| **PostgreSQL** | Source of truth for all blog/user data. Only used for raw data fetch via `IN (...)`, never for ranking. |
| **FastAPI** | Async Python web framework. Handles all HTTP requests. |
| **aiokafka** | Async Kafka producer and consumer Python library. |
| **aioredis** | Async Redis client for Python. |

---

## Core Components

### 1. Meilisearch (Full-Text Search)

**File:** `backend/app/api/api_v1/endpoints/search.py`

Meilisearch is the entry point for all text-based queries. When a user types a search term:

- It queries the `blogs` index with fuzzy/typo-tolerant full-text matching.
- Returns up to **500 ordered blog IDs** ranked by pure text relevance.
- These IDs represent the initial candidate pool — a relevance-ordered list.

```python
ms_res = client.index('blogs').search(search_query.strip(), {
    'limit': 500,
    'attributesToRetrieve': ['id']
})
meilisearch_ids = [hit['id'] for hit in ms_res.get('hits', [])]
```

Meilisearch also powers:
- **User/Author search** (searches the `users` index)
- **Category search** (searches the `categories` index)
- **Search suggestions / autocomplete** (`/search/suggestions` endpoint)

#### Meilisearch Indexing
New blogs are indexed into Meilisearch **asynchronously via Kafka** — not synchronously during the HTTP request. When a blog is created or updated, the API publishes an `index` event to Kafka. The `SearchConsumer` worker picks it up and calls `meilisearch.index('blogs').add_documents([payload])`.

---

### 2. Kafka (Event Streaming)

**Files:**
- Producer: `backend/app/services/search_publisher.py`
- Consumer: `backend/app/workers/search_consumer.py`
- Topic: `search_indexing` (configured via `KAFKA_SEARCH_TOPIC`)

Kafka is the nervous system of the entire telemetry pipeline. The FastAPI endpoints never directly process analytics — they simply fire an event and move on.

#### Kafka Producer — `SearchPublisher`

```python
event = {
    "action": "blog_view",   # index | delete | query | click | blog_view | blog_like | blog_comment | blog_bookmark
    "index": "blogs",
    "id": str(blog_id),
    "payload": { "user_id": "..." }
}
await producer.send_and_wait(settings.KAFKA_SEARCH_TOPIC, event)
```

The producer is started during FastAPI `startup` and stopped during `shutdown`, ensuring zero message loss.

#### Kafka Consumer — `SearchConsumer`

The consumer runs as a **long-running async background task** (`asyncio.create_task`) inside the FastAPI process. It listens to the `search_indexing` Kafka topic and processes each event according to its `action` field.

---

### 3. Redis (In-Memory Data Store)

Redis stores **five categories of ML signals**, all in sorted sets or hashes for O(log N) operations:

| Key Pattern | Type | What it stores |
|---|---|---|
| `trending:blogs` | Sorted Set | Global blog popularity scores. Higher = more trending. |
| `blog:stats:{id}` | Hash | `views` count and `likes` count per blog. |
| `search:stats:{query}` | Hash | `queries` count and `clicks` count for a search keyword. |
| `trending:searches` | Sorted Set | Trending keyword scores (for autocomplete). |
| `search:query:{q}:clicks` | Sorted Set | Per-blog click scores for a specific search keyword. |
| `user:{id}:affinity:category` | Sorted Set | User's category interest scores. |
| `user:{id}:affinity:tag` | Sorted Set | User's tag interest scores. |
| `user:{id}:affinity:author` | Sorted Set | User's author follow/interest scores. |
| `user:{id}:history:viewed` | Set | Set of blog IDs the user has already read. |

All Redis reads are done using `asyncio.run()` from sync FastAPI endpoints, or natively `await` in async contexts.

---

### 4. Recommendation Engine (ML Ranking)

**File:** `backend/app/services/recommendation.py`

This is the brain of the system. It takes a list of raw blog objects and returns them sorted by a final computed ML score. It is called at the very end of the request after all data is fetched — no SQL sorting needed.

Four methods power the engine:

| Method | Description |
|---|---|
| `track_interest()` | Updates a user's Redis affinity vectors based on their interaction with a blog. |
| `get_user_affinity()` | Reads the top categories, tags, and authors a user is interested in from Redis. |
| `calculate_base_score()` | Computes a raw popularity score from a blog's engagement metrics. |
| `calculate_gravity_score()` | Applies time decay to the base score using the HN Gravity formula. |
| `rank_feed()` | The main ranking function. Combines all signals into a final score for each blog. |

---

## Data Flow: End-to-End Request Lifecycle

### A. User Searches for Something

```
User types "blog" in search bar (debouncedSearch)
          │
          ▼
Frontend: GET /api/v1/blogs?search_query=blog&sort_by=latest
          │
          ▼ (blogs.py)
1. Publish "query" event to Kafka (background, non-blocking)
2. Call Meilisearch → get IDs ordered by text relevance: [45, 41, 42, 43, 46, 47, 7, 5]
3. Fetch trending:blogs zmscore for all IDs from Redis
4. Fetch search:query:blog:clicks zmscore for all IDs from Redis
5. Compute blended score per ID:
   final = (meilisearch_rank * 1.0) + (trending_score * 10.0) + (click_score * 500.0)
6. Sort IDs by blended score → re-ordered list
7. Python-side paginate: take [skip : skip + limit] slice
8. PostgreSQL IN (...) fetch — raw rows, no ORDER BY
9. Re-order rows in Python dict map to match sorted ID order
10. Pass blogs list through recommendation_engine.rank_feed(is_search=True, search_query="blog")
    → Applies personalization multiplier + click boost multiplier
11. Return ranked list to frontend
```

### B. User Clicks a Blog Post

```
User clicks blog post from search results
          │
          ▼
Frontend: searchService.trackSearch("blog", blog.id)
          │ POST /api/v1/search/track
          ▼
Kafka publish: { action: "click", id: "blog", payload: { query: "blog", blog_id: 41 } }
          │
          ▼ (SearchConsumer)
1. hincrby search:stats:blog clicks 1
2. zincrby search:query:blog:clicks 1 "41"  ← THIS IS THE KEY ML SIGNAL
3. Recompute score = queries + (clicks * 5)
4. zadd trending:searches {"blog": score}
```

Next time the user searches "blog" → blog ID `41` gets a +500.0 score boost (and a 50.0x multiplier inside `rank_feed`), floating it instantly to position #1.

### C. User Interacts (Like, Comment, Bookmark)

```
User likes blog post 41
          │
          ▼
Frontend: POST /api/v1/interactions/blogs/41/like
          │
          ▼ (interactions.py)
1. Toggle like in PostgreSQL (only DB write for interaction state)
2. Kafka publish: { action: "blog_like", id: "41", payload: { user_id: "..." } }
          │
          ▼ (SearchConsumer)
1. hincrby blog:stats:41 likes 1
2. Recompute blog score = views + (likes * 10)
3. zadd trending:blogs {"41": new_score}
4. If user_id present:
   recommendation_engine.track_interest(user_id, 41, "like")
   → zincrby user:{id}:affinity:category  5  "{category_id}"
   → zincrby user:{id}:affinity:tag       5  "{tag_id}"
   → zincrby user:{id}:affinity:author    5  "{author_id}"
```

---

## Ranking Algorithm: How It Works

All ranking happens **100% in-memory in Python**. PostgreSQL never sorts.

### Step 1: Meilisearch Textual Relevance

Meilisearch returns IDs pre-ordered by textual relevance score. We convert this to a `meilisearch_rank` by reversing the index position:

```python
m_score = max_rank - idx  # Position 0 (best match) = highest score
```

### Step 2: Global Trending Score Blend (Redis)

Each blog has a `trending:blogs` score in Redis:

```
trending_score = views + (likes * 10)
```

This score is fetched via `ZMSCORE` for all IDs at once (O(N) single Redis round-trip).

### Step 3: Query-Specific Click Boost (Redis)

For each search keyword, we maintain a sorted set:
`search:query:{keyword}:clicks → {blog_id: click_count}`

This is fetched via `ZMSCORE` as well. Posts that users have previously clicked for this exact keyword get a massive boost:

```python
final_id_score = (m_score * 1.0) + (trending_score * 10.0) + (click_score * 500.0)
```

The **500x multiplier** ensures a post that was clicked even once for a specific query dominates all other relevance signals.

### Step 4: Behavioral Personalization Multiplier

Inside `recommendation_engine.rank_feed()`, each blog's affinity match with the user's Redis profile is computed:

```python
personalization_multiplier = 1.0

# Category match
cat_score = user_affinity["categories"].get(str(blog.category_id), 0)
personalization_multiplier += (cat_score * 0.1)

# Tag match
for tag in blog.tags:
    tag_score = user_affinity["tags"].get(str(tag.id), 0)
    personalization_multiplier += (tag_score * 0.05)

# Author match
author_score = user_affinity["authors"].get(str(blog.author_id), 0)
personalization_multiplier += (author_score * 0.15)
```

### Step 5: Time Decay (Gravity)

Based on the **Hacker News gravity formula**, newer posts with engagement score higher than older posts:

```python
# Age in hours
age_hours = (now - blog.created_at).total_seconds() / 3600.0

# Smooth 24-hour decay
time_factor = 1.0 / math.pow(1.0 + (age_hours / 24.0), 1.2)

if base_score > 0:
    gravity_score = (base_score * 0.5 + 1.0) * time_factor
else:
    # Zero-engagement posts still get a freshness score
    gravity_score = 0.1 * time_factor
```

### Step 6: Read-History Penalty (Feed Only)

For **feed mode** (homepage, trending), posts a user has already read get penalized to surface fresh content:

```python
# Feed mode: penalize already-read posts
read_multiplier = 0.2 if str(blog.id) in viewed_ids else 1.0

# Search mode: NO penalty (user is explicitly looking for it)
if is_search:
    read_multiplier = 1.0
```

### Final Score Formula

```
final_score = gravity_score × personalization_multiplier × read_multiplier × search_click_multiplier

Where:
  gravity_score          = time_decay(base_popularity_score)
  personalization_multi  = 1.0 + category_affinity + tag_affinity + author_affinity
  read_multiplier        = 0.2 if already viewed (feed only), else 1.0
  search_click_multi     = 1.0 + (exact_clicks_for_this_query * 50.0)
```

Blogs are sorted descending by `final_score` entirely in Python, then returned.

---

## Behavioral Tracking & Affinity Profiling

### Interaction Weights

Each type of user interaction with a blog contributes differently to the user's affinity profile:

| Interaction | Weight | Reasoning |
|---|---|---|
| `view` | 1 | Passive signal, user may have just scrolled past |
| `like` | 5 | Active positive signal |
| `comment` | 7 | Highest engagement — user typed a response |
| `bookmark` | 10 | Strongest intent to revisit content |

### Affinity Vectors in Redis

For every interaction, the engine runs a Redis pipeline that atomically updates three sorted sets:

```python
# Category affinity: "I like this type of content"
redis_pipeline.zincrby(f"user:{user_id}:affinity:category", weight, str(blog.category_id))

# Tag affinity: "I like these specific topics"
for tag in blog.tags:
    redis_pipeline.zincrby(f"user:{user_id}:affinity:tag", weight, str(tag.id))

# Author affinity: "I like this writer"
redis_pipeline.zincrby(f"user:{user_id}:affinity:author", weight, str(blog.author_id))

# Viewed history: "Don't show me this again on the feed"
if interaction_type == "view":
    redis_pipeline.sadd(f"user:{user_id}:history:viewed", str(blog_id))

await redis_pipeline.execute()  # Single atomic operation
```

The top 10 categories, 20 tags, and 10 authors are retrieved at ranking time via `ZREVRANGE`.

---

## Redis Key Schema

```
trending:blogs                          Sorted Set  { blog_id: trending_score }
blog:stats:{blog_id}                    Hash        { views: N, likes: N }
search:stats:{query}                    Hash        { queries: N, clicks: N }
trending:searches                       Sorted Set  { keyword: ml_score }
search:query:{query}:clicks             Sorted Set  { blog_id: click_count }
user:{user_id}:affinity:category        Sorted Set  { category_id: weight_sum }
user:{user_id}:affinity:tag             Sorted Set  { tag_id: weight_sum }
user:{user_id}:affinity:author          Sorted Set  { author_id: weight_sum }
user:{user_id}:history:viewed           Set         { blog_id, blog_id, ... }
```

---

## Kafka Topic & Event Schema

**Topic:** `search_indexing`

All events follow the same envelope format:

```json
{
  "action": "string",
  "index": "string",
  "id": "string",
  "payload": { }
}
```

| `action` | `index` | `id` | `payload` | Description |
|---|---|---|---|---|
| `index` | `blogs` / `users` / `categories` | doc id | full document dict | Index document in Meilisearch |
| `delete` | `blogs` / `users` | doc id | — | Remove document from Meilisearch |
| `query` | `search_queries` | query string | `{ "query": "..." }` | Record a search keyword |
| `click` | `search_queries` | query string | `{ "query": "...", "blog_id": N }` | Record a blog click for this keyword |
| `blog_view` | `blogs` | blog id | `{ "blog_id": N, "user_id": "..." }` | User viewed a blog |
| `blog_like` | `blogs` | blog id | `{ "blog_id": N, "user_id": "..." }` | User liked a blog |
| `blog_comment` | `blogs` | blog id | `{ "blog_id": N, "user_id": "..." }` | User commented on a blog |
| `blog_bookmark` | `blogs` | blog id | `{ "blog_id": N, "user_id": "..." }` | User bookmarked a blog |

---

## Key Files & Codebase Map

```
backend/
├── app/
│   ├── api/api_v1/endpoints/
│   │   ├── blogs.py            ← Main search endpoint, ID blending, in-memory sort
│   │   ├── search.py           ← Full-text search, /track, /suggestions endpoints
│   │   └── interactions.py     ← Like, comment, bookmark → Kafka events
│   │
│   ├── services/
│   │   ├── search_publisher.py ← Kafka producer wrapper
│   │   └── recommendation.py   ← ML ranking engine (rank_feed, track_interest)
│   │
│   ├── workers/
│   │   └── search_consumer.py  ← Kafka consumer, processes all telemetry events
│   │
│   └── core/
│       └── redis_client.py     ← Redis connection singleton
│
frontend/
└── src/
    ├── pages/blogs/BlogList.tsx     ← Calls trackSearch() on blog link click
    ├── pages/explore/TopicDetail.tsx← Also calls trackSearch() on search
    └── services/searchService.ts    ← trackSearch(), searchAll(), getSuggestions()
```

---

## Search Auto-Suggestions

**Endpoint:** `GET /api/v1/search/suggestions?q={prefix}`

Autocomplete suggestions are powered entirely by Redis — no Meilisearch or DB call:

1. Fetch top 200 keywords from `trending:searches` sorted set (these are real user searches, scored by ML heuristic).
2. Filter in-memory for prefix match: `term.startswith(q)`.
3. If fewer than 8 matches, backfill with infix matches: `q in term`.
4. Return top 8.

This makes suggestions **real search terms that other users have actually searched**, ranked by how much engagement that query has received.

---

## Design Decisions & Trade-offs

### Why Kafka instead of direct Redis writes?

Using Kafka as an intermediary means:
- The FastAPI API response is never slowed down by analytics processing.
- If Redis is temporarily unavailable, Kafka retains the events and the consumer catches up later.
- All analytics processing is centralized in one worker, not scattered across endpoints.

### Why in-memory sorting instead of SQL ORDER BY?

When ranking requires combining signals from three different data sources (Meilisearch, Redis, user affinity), there is no way to express this as a single SQL query without either:
- Doing three separate queries and joining in Python anyway, or
- Using a giant, unmaintainable SQL `CASE` statement that only sorts on static DB columns.

Sorting in Python is fast (O(N log N) for N ≤ 500 candidate IDs), clean, and maintainable.

### Why paginate in Python before hitting the DB?

Meilisearch returns up to 500 IDs. If we passed all 500 to `WHERE id IN (...)` and asked DB to sort, the DB sorts 500 rows for every request. By paginating in Python first (taking only 10-20 IDs), the DB `IN` query fetches exactly 10-20 rows — the fastest possible lookup.

### Search vs. Feed: Different Personalization Rules

- **Feed mode**: Read-history penalty is active (0.2x for viewed posts). Goal: surface fresh, unexplored content.
- **Search mode**: Read-history penalty is **disabled**. Goal: find the exact thing you searched for, even if you've already seen it.

---

## Why We Removed SQL CASE Sorting

The original implementation used:

```python
from sqlalchemy import case

# Old approach — DO NOT USE
query = query.order_by(
    case(
        *[(BlogModel.id == b_id, idx) for idx, b_id in enumerate(meilisearch_ids)],
        else_=999999
    )
)
```

**Problems with this approach:**
1. PostgreSQL had to evaluate a `CASE WHEN id=45 THEN 0 WHEN id=41 THEN 1...` expression for every row scanned.
2. The sort was purely static — it could only reflect Meilisearch order, not Redis trending scores or user affinity.
3. It violated the core principle: **PostgreSQL should only fetch, not rank**.
4. It was impossible to integrate multi-signal ML scoring into a SQL expression.

**Replacement:** Fetch all candidate rows in one `IN (...)` query into memory, then sort the Python list using the pre-computed `feed_rank_score` attribute that `rank_feed()` attaches to each blog object.

---

*Last Updated: 2026-07-27 | BareMind Search System v1.0*
