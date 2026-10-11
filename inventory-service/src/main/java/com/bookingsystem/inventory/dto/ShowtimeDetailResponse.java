package com.bookingsystem.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
public class ShowtimeDetailResponse {
    private UUID id;
    private MovieSummaryResponse movie;
    private UUID theaterId;
    private String theaterName;
    private String theaterCity;
    private String screenName;
    private LocalDate showDate;
    private LocalTime showTime;
}
