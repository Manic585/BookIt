-- Seed a small demo catalog: movies, theaters, showtimes, and a full seat map per showtime.

INSERT INTO movies (id, title, description, poster_url, banner_url, duration_minutes, genre, language, rating, release_date) VALUES
    (gen_random_uuid(), 'Quantum Horizon', 'A physicist unravels a conspiracy that threatens to collapse reality itself.', 'https://picsum.photos/seed/quantum-horizon/400/600', 'https://picsum.photos/seed/quantum-horizon-banner/1200/500', 148, 'Sci-Fi', 'English', 'UA', CURRENT_DATE - INTERVAL '10 days'),
    (gen_random_uuid(), 'Midnight in Madras', 'A noir thriller following a detective through the rain-soaked streets of a city that never sleeps.', 'https://picsum.photos/seed/midnight-madras/400/600', 'https://picsum.photos/seed/midnight-madras-banner/1200/500', 132, 'Thriller', 'Tamil', 'A', CURRENT_DATE - INTERVAL '5 days'),
    (gen_random_uuid(), 'The Last Harvest', 'A family drama set across three generations of farmers fighting to keep their land.', 'https://picsum.photos/seed/last-harvest/400/600', 'https://picsum.photos/seed/last-harvest-banner/1200/500', 156, 'Drama', 'Hindi', 'U', CURRENT_DATE - INTERVAL '20 days'),
    (gen_random_uuid(), 'Laugh Track', 'A washed-up comedian gets one final shot at a comeback tour.', 'https://picsum.photos/seed/laugh-track/400/600', 'https://picsum.photos/seed/laugh-track-banner/1200/500', 118, 'Comedy', 'English', 'UA', CURRENT_DATE - INTERVAL '2 days'),
    (gen_random_uuid(), 'Steel Rain', 'An elite squad races against time to stop a rogue satellite strike.', 'https://picsum.photos/seed/steel-rain/400/600', 'https://picsum.photos/seed/steel-rain-banner/1200/500', 141, 'Action', 'English', 'UA', CURRENT_DATE - INTERVAL '15 days'),
    (gen_random_uuid(), 'Paper Moons', 'Two strangers fall in love over the course of one impossible night.', 'https://picsum.photos/seed/paper-moons/400/600', 'https://picsum.photos/seed/paper-moons-banner/1200/500', 124, 'Romance', 'Hindi', 'U', CURRENT_DATE - INTERVAL '7 days');

INSERT INTO theaters (id, name, city, address) VALUES
    (gen_random_uuid(), 'PVR Forum Mall', 'Bengaluru', 'Forum Mall, Hosur Road, Koramangala, Bengaluru'),
    (gen_random_uuid(), 'INOX Phoenix Marketcity', 'Chennai', 'Phoenix Marketcity, Velachery Main Road, Chennai'),
    (gen_random_uuid(), 'Cinepolis Nexus Mall', 'Hyderabad', 'Nexus Mall, Banjara Hills, Hyderabad');

-- For every movie x theater x next 3 days x {12:00, 19:00}, create a showtime and its full seat map.
DO $$
DECLARE
    mv RECORD;
    th RECORD;
    d  INTEGER;
    show_time_slot TIME;
    show_id UUID;
    screen_choice VARCHAR(50);
    r RECORD;
BEGIN
    FOR mv IN SELECT id FROM movies LOOP
        FOR th IN SELECT id FROM theaters LOOP
            FOR d IN 0..2 LOOP
                FOREACH show_time_slot IN ARRAY ARRAY['12:00'::TIME, '19:00'::TIME] LOOP
                    screen_choice := 'Screen ' || (1 + floor(random() * 3))::INT;
                    show_id := gen_random_uuid();

                    INSERT INTO showtimes (id, movie_id, theater_id, screen_name, show_date, show_time)
                    VALUES (show_id, mv.id, th.id, screen_choice, CURRENT_DATE + d, show_time_slot);

                    -- NORMAL: rows A-D, 10 seats/row, price 150
                    FOR r IN SELECT * FROM (VALUES ('A'),('B'),('C'),('D')) AS rows(row_letter) LOOP
                        INSERT INTO inventory_items (reference_id, seat_class, label, seat_row, seat_number, available_date, price)
                        SELECT show_id, 'NORMAL', 'Row ' || r.row_letter || ' Seat ' || n, r.row_letter, n, CURRENT_DATE + d, 150.00
                        FROM generate_series(1, 10) AS n;
                    END LOOP;

                    -- EXECUTIVE: rows E-G, 10 seats/row, price 250
                    FOR r IN SELECT * FROM (VALUES ('E'),('F'),('G')) AS rows(row_letter) LOOP
                        INSERT INTO inventory_items (reference_id, seat_class, label, seat_row, seat_number, available_date, price)
                        SELECT show_id, 'EXECUTIVE', 'Row ' || r.row_letter || ' Seat ' || n, r.row_letter, n, CURRENT_DATE + d, 250.00
                        FROM generate_series(1, 10) AS n;
                    END LOOP;

                    -- PREMIUM: rows H-I, 8 seats/row, price 350
                    FOR r IN SELECT * FROM (VALUES ('H'),('I')) AS rows(row_letter) LOOP
                        INSERT INTO inventory_items (reference_id, seat_class, label, seat_row, seat_number, available_date, price)
                        SELECT show_id, 'PREMIUM', 'Row ' || r.row_letter || ' Seat ' || n, r.row_letter, n, CURRENT_DATE + d, 350.00
                        FROM generate_series(1, 8) AS n;
                    END LOOP;

                    -- RECLINER: row J, 6 seats, price 600
                    INSERT INTO inventory_items (reference_id, seat_class, label, seat_row, seat_number, available_date, price)
                    SELECT show_id, 'RECLINER', 'Row J Seat ' || n, 'J', n, CURRENT_DATE + d, 600.00
                    FROM generate_series(1, 6) AS n;

                END LOOP;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
