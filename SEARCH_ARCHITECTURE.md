# BareMind Search Architecture for 1M Users

## Core Architecture

For BareMind at ~1,000,000 users, search is redesigned so PostgreSQL is almost never involved in the interactive search hot path.

```text
PostgreSQL   → canonical application data
Meilisearch  → search/retrieval engine
Redis        → autocomplete signals, history, cache, rate limiting
Workers      → indexing + analytics + aggregation
BareMind     → personalized reranking
```

The important distinction is that 1M registered users does not mean 1M simultaneous users. Design for measured QPS, concurrent sessions, latency SLOs, index size, and event volume, then scale horizontally.

## 1. Production Architecture

```text
                              ┌─────────────────────┐
                              │      React App      │
                              │     BareMind UI     │
                              └──────────┬──────────┘
                                         │
                                      HTTPS
                                         │
                              ┌──────────▼──────────┐
                              │ CDN / Load Balancer│
                              │ + WAF / Rate Limit │
                              └──────────┬──────────┘
                                         │
                       ┌─────────────────┴─────────────────┐
                       │                                   │
                 TYPE / AUTOCOMPLETE                  ENTER / SEARCH
                       │                                   │
                       ▼                                   ▼
             /search/suggestions                      /search
                       │                                   │
             ┌─────────▼─────────┐               ┌────────▼────────┐
             │ Suggestion Service│               │  Search Service │
             └─────────┬─────────┘               └────────┬────────┘
                       │                                   │
             ┌─────────┴─────────┐             ┌───────────┴───────────┐
             │                   │             │                       │
             ▼                   ▼             ▼                       ▼
          Redis              Meilisearch   Redis Cache             Meilisearch
      Personal/Trend         Suggestions   + user signals          Posts Index
             │                   │             │                       │
             └─────────┬─────────┘             └──────────┬────────────┘
                       │                                  │
                       ▼                                  ▼
               Suggestion Ranker                 Candidate Results
                       │                                  │
                       ▼                                  ▼
                 Top 5-8 only                    BareMind Re-ranker
                                                          │
                                                          ▼
                                                    Final Results
                                                          │
                                                          ▼
                                                       React

                              ASYNC / BACKGROUND PLANE

                    ┌─────────────────────────────────────┐
                    │          Event Queue/Stream         │
                    └───────┬──────────┬──────────┬───────┘
                            │          │          │
                            ▼          ▼          ▼
                       Analytics    Search     Ranking/
                        Worker      Worker     Profile Worker
                            │          │          │
                            ▼          ▼          ▼
                       PostgreSQL Meilisearch    Redis
```

There are effectively two planes. The serving plane must be fast and avoid PostgreSQL. The background plane handles persistence, indexing, analytics, counters and behavioral learning.

## 2. Frontend Request Control

- minimum characters: 2
- debounce: ~200ms
- cancel stale requests (AbortController)
- max suggestions: 5-8

Typing only fetches suggestions. Full search algorithm is only executed when hitting Enter.

## 3. Suggestion Flow

1. Browser debounces input.
2. `GET /search/suggestions?q=prefix`
3. Backend checks Redis `suggest:global:prefix`.
4. On miss, searches Meilisearch `search_suggestions` index, caches in Redis.
5. Merges global candidates with Redis personal user signals (`user:{id}:recent_searches`).
6. Reranks in memory and returns top 5-8 suggestions.

PostgreSQL queries: 0.

## 4. Full Search Flow

1. User hits Enter.
2. `GET /api/v1/search?q=full_query`
3. Backend checks Redis candidate cache `search:candidates:{query_hash}`.
4. On miss, searches Meilisearch `posts` index for top 50-100 results, caches in Redis.
5. Loads user profile from Redis (`user:{id}:topic_affinity`, etc.).
6. BareMind Ranker scores and reranks candidates.
7. Emits `SEARCH_EXECUTED` event asynchronously.
8. Returns top 20 paginated results.

PostgreSQL queries: 0.

## 5. Event Architecture

Events like `SEARCH_EXECUTED`, `POST_CLICKED`, `POST_READ` are pushed to Kafka/Redis Streams and processed asynchronously by workers. This populates `user:{id}:recent_searches`, `trend:2026-07-27:13`, and persists durable logs to PostgreSQL.

## 6. The Five Rules Enforced

1. **Typing never executes the main search algorithm or queries PostgreSQL.**
2. **Meilisearch retrieves textual candidates; Redis does not replace a search engine.**
3. **Redis stores/cache fast-changing behavior, history, popularity and candidate results.**
4. **PostgreSQL remains the source of truth, with writes/index synchronization handled asynchronously and reliably.**
5. **Your existing BareMind behavioral algorithm reranks only a small relevant candidate set instead of scanning the database.**
