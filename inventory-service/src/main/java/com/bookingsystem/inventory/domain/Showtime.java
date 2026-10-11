package com.bookingsystem.inventory.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * A single screening of a movie at a theater/screen on a given date and time.
 * This id doubles as the "referenceId" already used throughout inventory_items and bookings.
 */
@Entity
@Table(name = "showtimes", indexes = {
        @Index(name = "idx_showtime_movie_date", columnList = "movie_id, show_date"),
        @Index(name = "idx_showtime_theater_date", columnList = "theater_id, show_date")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "movie_id", nullable = false)
    private UUID movieId;

    @Column(name = "theater_id", nullable = false)
    private UUID theaterId;

    @Column(name = "screen_name", nullable = false, length = 50)
    private String screenName;

    @Column(name = "show_date", nullable = false)
    private LocalDate showDate;

    @Column(name = "show_time", nullable = false)
    private LocalTime showTime;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
