package com.bookingsystem.inventory.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class SeatMapResponse {
    private UUID showtimeId;
    private LocalDate date;
    private List<SeatClassSection> sections;

    @Data
    @Builder
    public static class SeatClassSection {
        private String seatClass;
        private BigDecimal price;
        private List<SeatRow> rows;
    }

    @Data
    @Builder
    public static class SeatRow {
        private String row;
        private List<Seat> seats;
    }

    @Data
    @Builder
    public static class Seat {
        private UUID id;
        private int seatNumber;
        private String label;
        private String status;
    }
}
