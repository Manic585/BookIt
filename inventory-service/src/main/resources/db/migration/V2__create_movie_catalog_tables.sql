CREATE TABLE movies (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    poster_url       VARCHAR(500) NOT NULL,
    banner_url       VARCHAR(500),
    duration_minutes INTEGER      NOT NULL,
    genre            VARCHAR(100) NOT NULL,
    language         VARCHAR(50)  NOT NULL,
    rating           VARCHAR(10)  NOT NULL,
    release_date     DATE         NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_movies_updated_at
    BEFORE UPDATE ON movies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE theaters (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(150) NOT NULL,
    city       VARCHAR(100) NOT NULL,
    address    VARCHAR(300) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_theaters_updated_at
    BEFORE UPDATE ON theaters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE showtimes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id    UUID        NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    theater_id  UUID        NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
    screen_name VARCHAR(50) NOT NULL,
    show_date   DATE        NOT NULL,
    show_time   TIME        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_showtime_movie_date   ON showtimes (movie_id, show_date);
CREATE INDEX idx_showtime_theater_date ON showtimes (theater_id, show_date);

CREATE TRIGGER trg_showtimes_updated_at
    BEFORE UPDATE ON showtimes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seat-map coordinates for a bookable seat (row letter + seat number within row)
ALTER TABLE inventory_items ADD COLUMN seat_row    VARCHAR(5);
ALTER TABLE inventory_items ADD COLUMN seat_number INTEGER;
