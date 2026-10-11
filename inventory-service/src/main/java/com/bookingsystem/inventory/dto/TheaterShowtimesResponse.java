package com.bookingsystem.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TheaterShowtimesResponse {
    private UUID theaterId;
    private String theaterName;
    private String theaterCity;
    private List<ShowtimeSlot> showtimes;

    @Data
    @Builder
    public static class ShowtimeSlot {
        private UUID showtimeId;
        private String screenName;
        private LocalTime showTime;
    }
}
