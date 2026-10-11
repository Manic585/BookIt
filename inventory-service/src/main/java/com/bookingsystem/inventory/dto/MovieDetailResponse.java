package com.bookingsystem.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class MovieDetailResponse {
    private UUID id;
    private String title;
    private String description;
    private String posterUrl;
    private String bannerUrl;
    private int durationMinutes;
    private String genre;
    private String language;
    private String rating;
    private LocalDate releaseDate;
}
