package com.bookingsystem.inventory.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "movies")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "poster_url", nullable = false, length = 500)
    private String posterUrl;

    @Column(name = "banner_url", length = 500)
    private String bannerUrl;

    @Column(name = "duration_minutes", nullable = false)
    private int durationMinutes;

    @Column(nullable = false, length = 100)
    private String genre;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(nullable = false, length = 10)
    private String rating;

    @Column(name = "release_date", nullable = false)
    private LocalDate releaseDate;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
