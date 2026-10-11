# BookIt — Indian Cinema Movie Ticket Booking Platform

A production-style, microservices movie ticket booking platform for Indian cinemas, built with **Java 21 + Spring Boot 3**, **Angular 21**, **PostgreSQL**, **Redis**, **Kafka**, and **Spring AI (GPT-4o-mini)**.

Users browse movies, choose a theater and showtime, select seats across four classes (Normal / Executive / Premium / Recliner), and submit bookings priced in INR. The project demonstrates seat locking, idempotency, and a Kafka-based booking workflow. Payments are currently simulated, and the distributed workflow has known gaps described below; this is not a production-ready checkout.

---

## Architecture Overview

```text
Angular frontend :4200
        |
        | HTTP locally; terminate HTTPS at your deployment ingress
        v
API Gateway :8080 (or PORT)
        |-- /api/auth/**, /api/users/** --> User Service :8081
        |-- /api/inventory/** ----------> Inventory Service :8082
        |-- /api/bookings/** -----------> Booking Service :8083
        |-- /api/payments/** -----------> Payment Service :8084
        `-- /api/ai/** -----------------> AI Service :8086
                                              |-- HTTP --> Inventory Service
                                              `-- HTTP --> Booking Service

Booking / Payment -- events --> Kafka
                                  |--> Inventory / Booking / Payment consumers
                                  `--> Notification Service :8085 --> SMTP

PostgreSQL: userdb, inventorydb, bookingdb, paymentdb
Redis: refresh tokens, inventory locks/cache, gateway rate limits
```

See [gateway architecture](api-gateway/ARCHITECTURE.md) for routing details.

### Domain model

The inventory service owns the **movie, theater, showtime, and seat catalog**:

- `movies` stores titles, descriptions, images, language, genre, duration, and rating.
- `theaters` stores cinema names, cities, and addresses.
- `showtimes` connects a movie and theater to a date, time, and `screenName`; there is no separate screen table.
- `referenceId` is the showtime UUID used by inventory and bookings.
- Each `InventoryItem` is one seat for a show, with a row, seat number, class, price, and availability state.
- Each `Booking` references one user and one seat. Selecting multiple seats creates independent bookings, so partial success is possible.

Flyway migration V3 seeds six movies, three theaters, and shows at 12:00 and 19:00 for three days starting on the date the migration first runs. Each show has 92 seats: Normal ₹150, Executive ₹250, Premium ₹350, and Recliner ₹600. This seed does not refresh daily; an older database needs new showtime and inventory data to populate the UI's current date window.

---

## Microservices

| Service | Port | Database | Responsibility |
|---------|------|----------|---------------|
| API Gateway | `PORT` (default 8080) | Redis | Routing, auth, rate-limiting |
| User Service | 8081 | PostgreSQL `userdb` | Register, login, JWT |
| Inventory Service | 8082 | PostgreSQL `inventorydb` | Movie catalog, showtimes, seat maps, availability and locking |
| Booking Service | 8083 | PostgreSQL `bookingdb` | Ticket booking lifecycle, saga event handling |
| Payment Service | 8084 | PostgreSQL `paymentdb` | Simulated payment processing; payment-method model |
| Notification Service | 8085 | — | SMTP notification consumer (placeholder recipient) |
| AI Service | 8086 | — (in-memory) | Conversational movie-booking assistant, seat recommendations |

---

## AI Service

The AI Service (`ai-service`, port **8086**) adds a conversational layer on top of the ticket booking platform using **Spring AI** and **OpenAI GPT-4o-mini**.

### Features

| Feature | Details |
|---------|---------|
| Conversational assistant | Multi-turn chat with in-memory conversation history (last 20 messages per session) |
| Function-calling tools | `searchAvailability` calls Inventory Service for a show's open seats by class; `getBookingStatus` calls Booking Service; `getBookingFAQ` serves FAQ answers locally |
| Seat/show recommendations | Prompted JSON recommendations (summary, tips, estimated price range, top picks) based on seat-class preference, date, and budget |
| Quick insight | One-shot question endpoint with no conversation memory |

### How the assistant works

```
User message
     │
     ▼
ChatClient (Spring AI)
     │  system prompt: BookIt AI persona (Indian cinema) + today's date + available seat classes
     │  memory advisor: injects last N messages from in-memory store (per conversationId)
     ├─► Tool: searchAvailability  → GET http://inventory-service:8082/api/inventory/availability
     ├─► Tool: getBookingStatus    → GET http://booking-service:8083/api/bookings/{id}
     └─► Tool: getBookingFAQ       → local switch (cancellation / payment / booking / general)
     │
     ▼
ChatResponse { response, conversationId, suggestedActions[] }
```

GPT-4o-mini decides when to call which tool. The `conversationId` returned on the first call should be sent on subsequent calls to maintain context.

---

## Frontend (Angular 21, Standalone Components)

The `frontend/` app is a standalone-component Angular 21 SPA — no `NgModule`s. Routes lazy-load each feature via `loadComponent`.

### Structure

```text
frontend/src/
├── app/
│   ├── core/
│   │   ├── auth/                  Tokens and signal-based current user
│   │   ├── guards/                Authentication route guard
│   │   ├── interceptors/          Bearer token and refresh handling
│   │   ├── services/              Movie catalog, booking, and AI HTTP clients
│   │   └── models/                TypeScript API models
│   ├── features/
│   │   ├── auth/login, auth/register
│   │   ├── movies/list, movies/detail
│   │   ├── seats/                 Interactive seat map
│   │   ├── booking/confirm/        Per-seat booking submission/results
│   │   ├── dashboard/              Paginated booking history
│   │   └── ai/                     Conversational assistant
│   ├── app.routes.ts
│   └── app.config.ts
└── environments/                  Development and production API URLs
```

### Routes and booking journey

| Route | Screen | Login required |
|-------|--------|----------------|
| `/auth/login` | Login | No |
| `/auth/register` | Registration | No |
| `/movies` | Movie catalog | Yes |
| `/movies/:movieId` | Movie details and theater-grouped showtimes | Yes |
| `/showtimes/:showtimeId/seats` | Seat map | Yes |
| `/booking/confirm` | Review and submit bookings | Yes |
| `/dashboard` | Booking history and cancellation | Yes |
| `/ai-assistant` | AI chat | Yes |

The root and unknown routes redirect to `/movies`. The former `/search` screen has been replaced by catalog browsing.

1. Log in or register. Access and refresh tokens are stored in `localStorage`; the interceptor attaches the bearer token and attempts a refresh on a non-auth API 401.
2. Select a movie and choose a showtime for today or either of the next two days.
3. Select up to ten available seats. Selection is local UI state; it does not reserve seats yet.
4. Continue to confirmation. Showtime and seats are passed through Angular router/history state. Checkout without that state redirects to the catalog.
5. Submit one request per seat in parallel. Each gets its own booking and idempotency key. The initial response is not final payment/seat confirmation; follow-up processing happens asynchronously.
6. View booking history in the dashboard. Confirmed bookings cannot be cancelled through the current cancellation endpoint.

### Build and serve

From `frontend/`, use `npm ci` to install the locked dependency versions, `npm start` to serve on port 4200, and `npm run build` for a production build.

Development uses `http://localhost:8080/api`. The Angular dev server also configures `proxy.conf.json`, which is used when requests target relative `/api` URLs. Production replaces the environment with `apiUrl: '/api'`; configure the hosting reverse proxy to forward `/api` to the gateway and serve the SPA for frontend routes. A custom gateway port also requires updating the development API/proxy target.

---

## Saga Pattern — Booking Flow

The diagram shows the intended event flow. Inventory and payment consume `booking-created` independently; payment currently does not wait for a successful inventory hold. See the known limitations below.

```
User → POST /api/bookings
         │
         ▼
  Booking Service ──publishes──► [booking-created]
         │                              │
         │                    ┌─────────┴──────────┐
         │                    ▼                    ▼
         │          Inventory Service       Payment Service
         │         (hold inventory)     (simulate UPI payment)
         │                    │                    │
         │                    │    ┌───────────────┘
         │                    │    │ payment-completed / payment-failed
         │                    │    ▼
         │          Booking Service (CONFIRMED / FAILED)
         │          Inventory Service (BOOKED / AVAILABLE)
         │          Notification Service (email sent)
         │
         ▼
  Compensating actions on failure:
    payment-failed → Inventory released → Booking marked FAILED → User notified
```

---

## Concurrency & Double-Booking Prevention

Three layers of protection:

1. **Redis Distributed Lock** (`RedisDistributedLock.java`)  
   Before touching the DB, a `SET NX EX` lock is acquired per `itemId` (seat). The lock has a 10-second TTL. A competing request fails lock acquisition rather than queueing at Redis; Kafka processing can retry it. Lock is released via atomic Lua script to prevent accidental release by another caller.

2. **Pessimistic DB Lock** (`@Lock(LockModeType.PESSIMISTIC_WRITE)`)  
   `findByIdWithLock()` issues `SELECT ... FOR UPDATE`. Even if two requests slip past Redis, only one holds the row lock.

3. **Optimistic Locking** (`@Version` on `InventoryItem`)  
   A version counter on each row ensures any concurrent update after a stale read throws `OptimisticLockingFailureException`, caught by `@Retryable`.

**Hold duration**: Seats are held for 10 minutes.

**Expired hold cleanup**: A scheduled job (`@Scheduled(fixedDelay=120_000)`) runs every 2 minutes to release holds where `holdExpiresAt < NOW()`, preventing ghost-holds from crashes.

---

## Idempotency

Both Booking and Payment APIs accept a client-supplied `idempotencyKey`:

- On first call: persisted to DB with `UNIQUE` constraint
- On retry: DB lookup returns the existing record instantly (no re-processing)
- Race condition (concurrent identical keys): caught via `DataIntegrityViolationException` → fallback lookup

The frontend generates a `UUID v4` each time `createBooking()` is called. Retrying the same request payload preserves its key; submitting again creates a new key. Automatic payments use `auto-pay-<bookingId>`. These mechanisms do not provide an atomic multi-seat booking or exactly-once external charging.

---

## Kafka Event Design

| Topic | Producer | Current consumers |
|-------|----------|-------------------|
| `booking-created` | Booking | Inventory, Payment |
| `payment-completed` | Payment | Booking, Inventory, Notification |
| `payment-failed` | Payment | Booking, Inventory, Notification |
| `booking-cancelled` | Booking | Notification |

Booking, inventory, and payment retryable listeners configure four total attempts with a 1-second initial backoff, doubling between retries (10-second cap). Notification listeners configure five total attempts with a 2-second initial backoff (30-second cap). Exhausted processing routes to `.DLT` topics; existing handlers log errors, with external alerting left to implement.

Booking/payment producers configure `acks=all` and `enable.idempotence=true`. Events use the booking ID as their key. Database writes and Kafka publication are not atomic: there is no transactional outbox. Publisher and consumer payloads also need alignment (see known limitations).

---

## Security

- **JWT (HMAC-signed)**: 15-minute access tokens, 7-day refresh tokens stored in Redis
- **Refresh token rotation**: A successful `/auth/refresh` deletes the previous refresh token and issues a replacement; the read/delete sequence is not atomic
- **BCrypt (strength 12)**: Password hashing
- **Rate limiting**: Redis token bucket — 100 req/s per user, burst to 200
- **RBAC**: `@PreAuthorize("hasRole('ADMIN')")` on admin endpoints
- **Downstream trust**: Services rely on gateway-provided `X-User-Id` / `X-User-Role` headers, so backend access must be restricted to trusted callers. User-service additionally supports direct JWT validation when those headers are absent

---

## Database Schema

### `users`
```sql
id UUID PK, email UNIQUE, password_hash, first_name, last_name,
role {USER|ADMIN}, active BOOL, created_at, updated_at
```
Indexes: `email` (unique), `active` (partial — active=TRUE only)

### Catalog tables

`movies` and `theaters` are linked by `showtimes(movie_id, theater_id, screen_name, show_date, show_time)`. Foreign keys connect showtimes to movies and theaters; indexes cover `(movie_id, show_date)` and `(theater_id, show_date)`. Inventory uses the showtime ID as its `reference_id`.

### `inventory_items`
```sql
id UUID PK, reference_id UUID (show ID), seat_class {NORMAL|EXECUTIVE|PREMIUM|RECLINER},
label, seat_row, seat_number, available_date DATE, status {AVAILABLE|HELD|BOOKED|CANCELLED}, booking_id UUID,
hold_expires_at TIMESTAMPTZ, price NUMERIC, version BIGINT
```
Indexes: `(seat_class, available_date, status)`, `(reference_id, available_date)`,
`booking_id`, `hold_expires_at WHERE status='HELD'`

### `bookings`
```sql
id UUID PK, user_id UUID, reference_id UUID, booking_type,
inventory_item_id UUID, booking_date DATE,
status {PENDING|INVENTORY_HELD|PAYMENT_PROCESSING|CONFIRMED|CANCELLED|FAILED},
total_amount NUMERIC, idempotency_key UNIQUE, failure_reason TEXT
```
Indexes: `(user_id, created_at DESC)`, `status`, `(reference_id, booking_date)`

### `payments`
```sql
id UUID PK, booking_id UUID, user_id UUID, amount NUMERIC,
currency (default 'INR'), status {PENDING|PROCESSING|COMPLETED|FAILED|REFUNDED},
payment_method {CARD|UPI|WALLET|NET_BANKING}, payment_reference, gateway_transaction_id,
idempotency_key UNIQUE, failure_reason TEXT
```
Indexes: `booking_id`, `user_id`, `status`

---

## Observability

| Concern | Tool | How to access |
|---------|------|--------------|
| Metrics | Micrometer + Prometheus | Each service exposes `/actuator/prometheus` |
| Health | Spring Actuator | Each service exposes `/actuator/health` |
| Logs | SLF4J; gateway/user log patterns include MDC traceId | stdout — configure trace propagation separately |

Prometheus can be run locally and pointed at the service ports using `observability/prometheus.yml`.

Structured log format:
```
2025-05-11T10:30:00Z [http-nio-1] [traceId=abc123] INFO  BookingService - Booking created: bookingId=..., userId=...
```

---

## Scaling Strategy

Most business state lives in PostgreSQL, Redis, and Kafka. AI conversation memory is an exception: it is process-local and is lost on restart or when a conversation reaches another instance.

- **Configured today:** per-service HikariCP pools (15–30 maximum connections), paginated booking history, Redis availability cache with a 60-second TTL, and independent Kafka consumer groups.
- **Refresh tokens:** Redis entries expire after seven days; successful refresh creates a new token with a new TTL.
- **Future work:** shared AI memory, read-replica routing, date-based inventory partitioning, additional Kafka partitions/workers, and connection-pool tuning. Read-only transactions do not currently route to replicas automatically.
- **Capacity:** no million-user load-test result is supplied. Validate contention, payment integration, database limits, and end-to-end correctness before capacity claims.

---

## Getting Started

### Prerequisites

- **Java 21** — [sdkman.io](https://sdkman.io) is the easiest way to install
- **Maven 3.9+** — Maven wrappers are not included; run `mvn` in each service directory
- **PostgreSQL 16** — install locally or via Homebrew: `brew install postgresql@16`
- **Redis 7** — `brew install redis`
- **Apache Kafka 3.6** — the local startup example below uses its ZooKeeper scripts
- **Node.js compatible with Angular 21** and npm — Angular CLI is installed through the frontend dependencies
- **Docker** — optional, for the backend container builds below

### 0. Supply local configuration

Service files at `<service>/src/main/resources/application.yml` are currently ignored by Git. A fresh clone therefore needs those configurations supplied before startup, including ports, datasource/Redis/Kafka settings, JWT properties, gateway routes, and AI service URLs. Environment variables override settings but do not recreate the missing gateway route definitions. There are no tracked configuration templates yet.

Keep the JWT signing secret identical in user-service and api-gateway. Set `JWT_SECRET` in both processes to override `jwt.secret`; do not rely on unrelated local defaults.

### 1. Start infrastructure

```bash
# PostgreSQL — create one DB per service
psql -U postgres -c "CREATE DATABASE userdb;"
psql -U postgres -c "CREATE DATABASE inventorydb;"
psql -U postgres -c "CREATE DATABASE bookingdb;"
psql -U postgres -c "CREATE DATABASE paymentdb;"

# Redis (runs on port 6379 by default)
redis-server

# Kafka — from your Kafka install directory
bin/zookeeper-server-start.sh config/zookeeper.properties &
bin/kafka-server-start.sh config/server.properties &
```

The Kafka commands above assume a Kafka 3.6 installation using ZooKeeper. Use the matching startup procedure if your local broker uses KRaft.

### 2. Run backend services

Open a terminal per service (or use your IDE's run configurations):

```bash
# Terminal 1
cd user-service && mvn spring-boot:run

# Terminal 2
cd inventory-service && mvn spring-boot:run

# Terminal 3
cd booking-service && mvn spring-boot:run

# Terminal 4
cd payment-service && mvn spring-boot:run

# Terminal 5
cd notification-service && mvn spring-boot:run

# Terminal 6
cd api-gateway && mvn spring-boot:run

# Terminal 7 (requires OPENAI_API_KEY)
export OPENAI_API_KEY='your-api-key'
cd ai-service && mvn spring-boot:run
```

Flyway migrations run automatically on startup and create all tables.

### 3. Run the frontend

```bash
cd frontend
npm ci
npm start   # http://localhost:4200
```

### 4. Log in

Open `http://localhost:4200/auth/login` after user-service and the gateway are running:

| Field | Default demo value |
|-------|--------------------|
| Email | `customer@bookingsystem.com` |
| Password | `Customer@123` |
| Role | `USER` |

`DefaultUserSeeder` creates this account at user-service startup only if the email does not already exist. It does not reset an existing password. You can also register a new account through `/auth/register`. The seeder is not profile-restricted; remove or restrict the demo account creation before a public deployment.

### Service URLs

| Service | URL |
|---------|-----|
| Angular App | http://localhost:4200 |
| API Gateway | http://localhost:8080 |
| User Service | http://localhost:8081/actuator/health |
| Inventory Service | http://localhost:8082/actuator/health |
| Booking Service | http://localhost:8083/actuator/health |
| Payment Service | http://localhost:8084/actuator/health |
| Notification Service | http://localhost:8085/actuator/health |
| AI Service | http://localhost:8086/actuator/health |

### Environment variables

With the local configuration files present, the following variables control service connections. Set them separately for each process/container:

| Variables | Purpose |
|-----------|---------|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Database connection for each of user, inventory, booking, and payment services; select its own database |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection where supported by the local configuration |
| `REDIS_PASSWORD` | Gateway/user Redis authentication; inventory can use `SPRING_DATA_REDIS_PASSWORD` |
| `KAFKA_BROKERS` | Broker bootstrap addresses for Kafka clients |
| `JWT_SECRET` | Shared JWT signing/verification key for user-service and gateway |
| `PORT` | Gateway listening port; defaults to 8080 |
| `USER_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `BOOKING_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `AI_SERVICE_URL` | Gateway downstream URLs; inventory/booking URLs are also used by AI tools |
| `OPENAI_API_KEY` | AI provider credential |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Notification-service SMTP settings |

Do not export one shared `DB_URL` for all four database-backed services. A `.env` file is not automatically loaded by these Maven commands; export values in the shell or pass an environment file to Docker.

### Docker builds and startup

Each of the seven Java service directories has a `Dockerfile` and `.dockerignore`. The build stage uses `maven:3.9-eclipse-temurin-21`, resolves dependencies before copying source for layer caching, and packages with `-DskipTests`. The runtime stage uses `eclipse-temurin:21-jre` and starts `/app/app.jar`. Tests are skipped during image builds.

Build from the repository root, using each service directory as its build context:

```bash
for service in api-gateway user-service inventory-service booking-service payment-service notification-service ai-service; do
  docker build -t "bookit/$service:local" "./$service"
done
```

Each `.dockerignore` excludes `target`, `.git`, and `.env`. It does not exclude `src/main/resources/application.yml`: if a local configuration is present there, it is packaged into the image. Use environment placeholders rather than embedded deployment credentials.

The gateway's local server configuration is:

```yaml
server:
  address: 0.0.0.0
  port: ${PORT:8080}
```

Example gateway container on Docker Desktop, with Redis and backend services running on the host and a shared `JWT_SECRET` already exported in your shell:

```bash
docker run --rm --name bookit-gateway \
  -p 8080:8080 \
  -e PORT=8080 \
  -e REDIS_HOST=host.docker.internal \
  -e USER_SERVICE_URL=http://host.docker.internal:8081 \
  -e INVENTORY_SERVICE_URL=http://host.docker.internal:8082 \
  -e BOOKING_SERVICE_URL=http://host.docker.internal:8083 \
  -e PAYMENT_SERVICE_URL=http://host.docker.internal:8084 \
  -e AI_SERVICE_URL=http://host.docker.internal:8086 \
  -e JWT_SECRET \
  bookit/api-gateway:local
```

`localhost` inside a container refers to that container. For container-to-container connections, use a shared Docker network and resolvable container/service names. PostgreSQL, Redis, Kafka, and SMTP must be reachable from their clients; Kafka's advertised broker addresses must also be reachable. If `PORT` changes, update the container-side port mapping accordingly. Other services retain their configured ports unless overridden with `SERVER_PORT`.

There is no Docker Compose stack or frontend Dockerfile in the repository; these images package the Java services only.

### Git hygiene and fresh-clone limitations

`.gitignore` covers Maven `target/`, Node dependencies, frontend build output, `frontend/.angular/`, TypeScript build metadata, coverage, logs, Redis persistence, and local environment files. `.env.example`, `.env.sample`, and `.env.template` are allowed as templates. Each service's `.dockerignore` controls its Docker build context independently.

Ignored files that were already tracked require removal from Git's index before the ignore rule applies. Their staged deletions remain visible until the cleanup is committed; local files can be retained with `git rm --cached`.

The current `.gitignore` also contains a broad `frontend/*` rule, which hides **new frontend source files**, and excludes service `application.yml` files. Some catalog/seat UI files described above exist locally but are not tracked. Narrow that frontend rule and include the intended source/configuration templates before expecting a fresh clone or remote build to reproduce this workspace. Keep dependency lockfiles under version control.

---

## API Reference (Key Endpoints)

```
POST   /api/auth/register          Register user
POST   /api/auth/login             Login, returns JWT
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Invalidate a refresh token
GET    /api/users/me               Current user profile

GET    /api/inventory/movies                         List movies
GET    /api/inventory/movies/{movieId}               Movie details
GET    /api/inventory/movies/{movieId}/showtimes?date=YYYY-MM-DD
                                                    Theater-grouped showtimes
GET    /api/inventory/showtimes/{showtimeId}          Showtime details
GET    /api/inventory/showtimes/{showtimeId}/seat-map  Seats grouped by class and row

GET    /api/inventory/availability?referenceId=&date=&seatClass=   Search available seats for a show

POST   /api/bookings               Create booking (idempotent)
GET    /api/bookings               My booking history (paginated)
GET    /api/bookings/{id}          Single booking
DELETE /api/bookings/{id}          Cancel booking

POST   /api/payments               Process a simulated payment (idempotency key required)
GET    /api/payments/booking/{id}  Payment for a booking

# AI Service (routed through the gateway to port 8086)
POST   /api/ai/chat                Conversational assistant (multi-turn)
                                   Body: { "message": "...", "conversationId": "...", "userId": "..." }
                                   Returns: { "response": "...", "conversationId": "...", "suggestedActions": [...] }

POST   /api/ai/recommendations     AI-generated seat-class/show recommendations
                                   Body: { "bookingType": "CINEMA",
                                           "date": "YYYY-MM-DD", "preferences": "...", "budget": "e.g. under ₹500" }
                                   Returns: { "summary", "tips", "bestTimeToBook",
                                              "estimatedPriceRange", "topPicks" }

GET    /api/ai/insight?question=   One-shot question (no conversation memory)
```

---

## Architecture Decisions & Trade-offs

| Decision | Choice | Trade-off |
|----------|--------|-----------|
| Database per service | Separate databases, which can share one PostgreSQL server locally | Clear ownership; cross-service consistency handled in application workflows |
| Saga (choreography) | Kafka events | No central coordinator needed; harder to trace end-to-end |
| Optimistic + Pessimistic lock | Both layers plus a Redis contention lock | Protects seat mutations; does not by itself guarantee end-to-end payment/booking correctness |
| Generic `referenceId` for shows | Catalog tables live in inventory-service; booking stores the showtime UUID | Decouples booking records from catalog details without a separate catalog service |
| Multi-seat checkout | One booking/request per seat | Simple reuse of the booking API; partial success is possible |
| JWT stateless + Redis refresh | Hybrid | Balance between stateless scaling and token revocation capability |
| Idempotency via DB unique key | Application-level | Requires stable retry keys; does not coordinate database commits, events, and external payment effects |
| Single Redis node | One Redis | Sufficient when DB locking is the true safety net; Redlock for stricter needs |
| AI conversation memory | In-memory (`MessageWindowChatMemory`, last 20 messages) | Zero infra cost; lost on restart — swap `InMemoryChatMemoryRepository` for Redis/DB-backed store for persistence |
| AI function-calling | Spring AI `@Tool` on `InventoryTools` / `BookingTools` | Model decides which tool to invoke; keeps AI layer decoupled from internal service contracts |


## Known Implementation Limitations

- **Saga ordering and contracts:** inventory and payment start concurrently on `booking-created`. Payment events lack `itemId` expected by inventory and user/amount fields expected by notifications. Align payloads and serialization before relying on final confirmation.
- **Recovery and cancellation:** publication is separate from the database transaction. Inventory does not consume `booking-cancelled`; booking confirmation does not guard against late payment events after cancellation. DLT handlers log rather than automatically reconcile state.
- **Payments:** `PaymentGateway` returns a simulated transaction ID. Auto-payment selects UPI, and real charging, refunds, and provider reconciliation are not implemented. Retry/circuit-breaker annotations currently sit on a private internally called method and need an interceptable integration boundary.
- **Availability:** the legacy availability query does not filter items by `referenceId`; its cache key omits seat class and page size. The catalog seat-map endpoint uses a separate showtime-scoped query. Expired-hold cleanup does not explicitly evict the availability cache.
- **Notifications:** emails use a placeholder recipient (`user@example.com`); user email resolution and a real e-ticket template remain to implement.
- **Gateway:** `/fallback` is configured but has no handler. The local CORS policy allows all origins.
- **AI:** chat history is in memory, sample show IDs and FAQ text can differ from the catalog/policy, and booking lookup takes a tool-supplied user ID rather than binding it to the authenticated principal.

These notes reflect source/configuration review, not a verified end-to-end deployment or load test.
