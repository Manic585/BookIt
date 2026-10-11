package com.bookingsystem.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class MovieSummaryResponse {
    private UUID id;
    private String title;
    private String posterUrl;
    private String genre;
    private String language;
    private int durationMinutes;
    private String rating;
    private LocalDate releaseDate;
}
