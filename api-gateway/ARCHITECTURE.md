# API Gateway — Architecture & Request Flow

## What it is

A Spring Cloud Gateway (reactive, WebFlux-based) service that sits in front of the
booking system's backend microservices. It is the single entry point for all
external HTTP traffic and is responsible for:

- Routing requests to the correct downstream service
- Authenticating requests (JWT) before they reach any service
- Rate limiting (Redis-backed token bucket)
- Circuit breaking around downstream calls
- CORS handling
- Exposing health/metrics for observability

It does not contain business logic — it is purely a routing/cross-cutting layer.

## Tech stack

| Concern | Technology |
|---|---|
| Framework | Spring Boot 3.2.5 + Spring Cloud Gateway (`2023.0.1`) |
| Runtime model | Reactive (Project Reactor / WebFlux), not servlet-based |
| Rate limiting | Redis (`spring-boot-starter-data-redis-reactive`) + `RedisRateLimiter` |
| Circuit breaking | Resilience4j (`spring-cloud-starter-circuitbreaker-reactor-resilience4j`) |
| Auth tokens | JJWT (`io.jsonwebtoken`), HMAC-signed |
| Observability | Actuator + Micrometer/Prometheus |

## Component map

```
src/main/java/com/bookingsystem/gateway/
├── ApiGatewayApplication.java        Spring Boot entry point (@SpringBootApplication)
└── filter/
    ├── JwtAuthenticationFilter.java  GlobalFilter — validates JWT, injects user headers
    └── RateLimitingFilter.java       @Configuration — defines KeyResolver + RedisRateLimiter beans
```

Routing itself is not code — it is declared entirely in `application.yml`
(`spring.cloud.gateway.routes`), which is how Spring Cloud Gateway is normally
configured.

## Request flow

Every inbound HTTP request passes through this pipeline, in order:

```
Client
  │
  ▼
┌─────────────────────────────────────────────┐
│ 1. Global CORS                               │  application.yml: globalcors
│    Applies allowedOrigins/Methods/Headers    │
│    to every path ("/**")                     │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 2. JwtAuthenticationFilter (GlobalFilter)    │  order = -100 → runs before routing
│                                               │
│    - Is path in PUBLIC_PATHS?                │
│        /api/auth/register                    │
│        /api/auth/login                       │
│        /api/auth/refresh                     │
│        /actuator                             │
│      → yes: skip auth, pass through          │
│      → no:  require "Authorization: Bearer"  │
│                                               │
│    - No/malformed header → 401, short-circuit│
│    - Verify JWT signature (HMAC, jwt.secret) │
│      → invalid/expired → 401, short-circuit  │
│      → valid: extract subject (userId) + role│
│                                               │
│    - Mutate request, add headers for          │
│      downstream services:                    │
│        X-User-Id                             │
│        X-User-Role                           │
│        X-Correlation-Id (= request id)        │
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 3. Route matching (predicates)               │  application.yml: routes[]
│    Path=/api/auth/**,/api/users/**  → user-service      (8081)
│    Path=/api/inventory/**           → inventory-service (8082)
│    Path=/api/bookings/**            → booking-service   (8083)
│    Path=/api/payments/**            → payment-service   (8084)
│    Path=/api/ai/**                  → ai-service        (8086)
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 4. Per-route filters                         │
│    RewritePath=/api/(?<segment>.*), /api/$segment
│      (currently a no-op rewrite — kept as an │
│       extension point for future path changes)│
└─────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────┐
│ 5. default-filters (applied to every route)  │
│                                               │
│    a) RequestRateLimiter                     │
│       key = userKeyResolver bean:            │
│         - if X-User-Id header present         │
│             → key "user:<id>"                │
│         - else (unauthenticated, e.g. login)  │
│             → key "ip:<remote-address>"       │
│       limiter = apiRateLimiter bean:          │
│         RedisRateLimiter(100 req/s replenish, │
│                          200 burst capacity)  │
│       → over limit: 429 Too Many Requests     │
│                                               │
│    b) CircuitBreaker ("globalCircuitBreaker") │
│       Resilience4j, per downstream call:      │
│         slidingWindow = 10 calls (count-based)│
│         minimumCalls = 5 before evaluating    │
│         failureRateThreshold = 50%            │
│         waitDurationInOpenState = 5s          │
│         halfOpen test calls = 3               │
│       → circuit OPEN: short-circuits to       │
│         forward:/fallback instead of calling  │
│         the downstream service                │
└─────────────────────────────────────────────┘
  │
  ▼
Downstream microservice (user / inventory / booking / payment / ai)
  │
  ▼
Response streamed back through the same reactive chain to the client
```

## How authentication + downstream trust works

The gateway is the **only** thing that verifies the JWT. Downstream services
never see the raw token — they trust the `X-User-Id` / `X-User-Role` headers
the gateway attaches after successful verification. This means:

- Downstream services must be network-isolated (only reachable via the
  gateway) — otherwise the header-based trust can be spoofed by calling them
  directly.
- The `jwt.secret` (`jwt.secret` in `application.yml`, overridable via
  `JWT_SECRET` env var) must be the same secret used by whatever service
  *issues* the tokens (user-service), since the gateway only verifies, it
  doesn't mint tokens.

## Rate limiting logic

- Authenticated users are limited **per user id**, so one user can't be
  starved by another user's traffic sharing the same IP (e.g. behind NAT/VPN).
- Unauthenticated requests (login/register, before a user has an id) fall
  back to **per-IP** limiting.
- Backed by Redis so the limit is enforced consistently even if multiple
  gateway instances are running behind a load balancer.

## Circuit breaking + fallback

- Configured globally (`globalCircuitBreaker`) via `default-filters`, so every
  route gets the same breaker behavior without per-route repetition.
- On too many failures to a downstream service, the breaker opens and the
  gateway forwards to `/fallback` instead of waiting on/hammering a failing
  service.
- **Known gap:** there is currently no controller/route registered for
  `/fallback` in this codebase, so an open circuit currently results in a 404
  rather than a graceful fallback response. This should be added (e.g. a
  `@RestController` mapping `/fallback` to a `503 Service Unavailable` with a
  friendly body).

## Configuration & environment

All routing targets and secrets are externalized via env vars with local
defaults, so the same jar runs unmodified across environments:

| Env var | Default | Purpose |
|---|---|---|
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | `localhost:6379` | Rate limiter store |
| `USER_SERVICE_URL` | `http://localhost:8081` | user-service route target |
| `INVENTORY_SERVICE_URL` | `http://localhost:8082` | inventory-service route target |
| `BOOKING_SERVICE_URL` | `http://localhost:8083` | booking-service route target |
| `PAYMENT_SERVICE_URL` | `http://localhost:8084` | payment-service route target |
| `AI_SERVICE_URL` | `http://localhost:8086` | ai-service route target |
| `JWT_SECRET` | (dev default in yml) | HMAC key for JWT verification |

## Observability

Actuator exposes `health`, `info`, `prometheus`, `metrics`, and `gateway`
endpoints. `health` includes a Redis health indicator, so a Redis outage is
visible directly in `/actuator/health`. Every request also gets an
`X-Correlation-Id` header (the gateway's request id) propagated downstream,
so a single request can be traced across services in logs.

## Note on CORS (`globalcors`)

`allowedOrigins: "*"` combined with `allowedMethods: "*"` / `allowedHeaders: "*"`
is a wide-open CORS policy — fine for local development, but should be
tightened to explicit origins before production, since a wildcard origin
means any website can call these APIs from a browser using a client's
credentials/token if it obtains one.