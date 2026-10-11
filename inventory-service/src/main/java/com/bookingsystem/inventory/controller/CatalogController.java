package com.bookingsystem.inventory.controller;

import com.bookingsystem.inventory.dto.MovieDetailResponse;
import com.bookingsystem.inventory.dto.MovieSummaryResponse;
import com.bookingsystem.inventory.dto.SeatMapResponse;
import com.bookingsystem.inventory.dto.ShowtimeDetailResponse;
import com.bookingsystem.inventory.dto.TheaterShowtimesResponse;
import com.bookingsystem.inventory.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class CatalogController {

    private final CatalogService catalogService;

    @GetMapping("/api/inventory/movies")
    public ResponseEntity<List<MovieSummaryResponse>> listMovies() {
        return ResponseEntity.ok(catalogService.listMovies());
    }

    @GetMapping("/api/inventory/movies/{movieId}")
    public ResponseEntity<MovieDetailResponse> getMovie(@PathVariable UUID movieId) {
        return ResponseEntity.ok(catalogService.getMovie(movieId));
    }

    @GetMapping("/api/inventory/movies/{movieId}/showtimes")
    public ResponseEntity<List<TheaterShowtimesResponse>> getShowtimes(
            @PathVariable UUID movieId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(catalogService.getShowtimesForMovie(movieId, date));
    }

    @GetMapping("/api/inventory/showtimes/{showtimeId}")
    public ResponseEntity<ShowtimeDetailResponse> getShowtime(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(catalogService.getShowtime(showtimeId));
    }

    @GetMapping("/api/inventory/showtimes/{showtimeId}/seat-map")
    public ResponseEntity<SeatMapResponse> getSeatMap(@PathVariable UUID showtimeId) {
        return ResponseEntity.ok(catalogService.getSeatMap(showtimeId));
    }
}
