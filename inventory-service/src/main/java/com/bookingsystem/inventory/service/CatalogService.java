package com.bookingsystem.inventory.service;

import com.bookingsystem.inventory.domain.InventoryItem;
import com.bookingsystem.inventory.domain.Movie;
import com.bookingsystem.inventory.domain.Showtime;
import com.bookingsystem.inventory.domain.Theater;
import com.bookingsystem.inventory.dto.MovieDetailResponse;
import com.bookingsystem.inventory.dto.MovieSummaryResponse;
import com.bookingsystem.inventory.dto.SeatMapResponse;
import com.bookingsystem.inventory.dto.ShowtimeDetailResponse;
import com.bookingsystem.inventory.dto.TheaterShowtimesResponse;
import com.bookingsystem.inventory.exception.NotFoundException;
import com.bookingsystem.inventory.repository.InventoryRepository;
import com.bookingsystem.inventory.repository.MovieRepository;
import com.bookingsystem.inventory.repository.ShowtimeRepository;
import com.bookingsystem.inventory.repository.TheaterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

    private static final List<InventoryItem.SeatClass> SEAT_CLASS_ORDER = List.of(
            InventoryItem.SeatClass.NORMAL,
            InventoryItem.SeatClass.EXECUTIVE,
            InventoryItem.SeatClass.PREMIUM,
            InventoryItem.SeatClass.RECLINER
    );

    private final MovieRepository movieRepository;
    private final TheaterRepository theaterRepository;
    private final ShowtimeRepository showtimeRepository;
    private final InventoryRepository inventoryRepository;

    public List<MovieSummaryResponse> listMovies() {
        return movieRepository.findAll().stream()
                .sorted(Comparator.comparing(Movie::getTitle))
                .map(this::toSummary)
                .toList();
    }

    public MovieDetailResponse getMovie(UUID movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new NotFoundException("Movie not found: " + movieId));
        return MovieDetailResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .description(movie.getDescription())
                .posterUrl(movie.getPosterUrl())
                .bannerUrl(movie.getBannerUrl())
                .durationMinutes(movie.getDurationMinutes())
                .genre(movie.getGenre())
                .language(movie.getLanguage())
                .rating(movie.getRating())
                .releaseDate(movie.getReleaseDate())
                .build();
    }

    public List<TheaterShowtimesResponse> getShowtimesForMovie(UUID movieId, LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new NotFoundException("Movie not found: " + movieId);
        }

        List<Showtime> showtimes = showtimeRepository.findByMovieIdAndShowDateOrderByShowTime(movieId, date);
        Map<UUID, Theater> theaters = theaterRepository.findAllById(
                        showtimes.stream().map(Showtime::getTheaterId).distinct().toList())
                .stream()
                .collect(Collectors.toMap(Theater::getId, t -> t));

        Map<UUID, List<Showtime>> byTheater = showtimes.stream()
                .collect(Collectors.groupingBy(Showtime::getTheaterId, LinkedHashMap::new, Collectors.toList()));

        return byTheater.entrySet().stream()
                .map(entry -> {
                    Theater theater = theaters.get(entry.getKey());
                    return TheaterShowtimesResponse.builder()
                            .theaterId(theater.getId())
                            .theaterName(theater.getName())
                            .theaterCity(theater.getCity())
                            .showtimes(entry.getValue().stream()
                                    .map(s -> TheaterShowtimesResponse.ShowtimeSlot.builder()
                                            .showtimeId(s.getId())
                                            .screenName(s.getScreenName())
                                            .showTime(s.getShowTime())
                                            .build())
                                    .toList())
                            .build();
                })
                .sorted(Comparator.comparing(TheaterShowtimesResponse::getTheaterName))
                .toList();
    }

    public ShowtimeDetailResponse getShowtime(UUID showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new NotFoundException("Showtime not found: " + showtimeId));
        Movie movie = movieRepository.findById(showtime.getMovieId())
                .orElseThrow(() -> new NotFoundException("Movie not found: " + showtime.getMovieId()));
        Theater theater = theaterRepository.findById(showtime.getTheaterId())
                .orElseThrow(() -> new NotFoundException("Theater not found: " + showtime.getTheaterId()));

        return ShowtimeDetailResponse.builder()
                .id(showtime.getId())
                .movie(toSummary(movie))
                .theaterId(theater.getId())
                .theaterName(theater.getName())
                .theaterCity(theater.getCity())
                .screenName(showtime.getScreenName())
                .showDate(showtime.getShowDate())
                .showTime(showtime.getShowTime())
                .build();
    }

    public SeatMapResponse getSeatMap(UUID showtimeId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new NotFoundException("Showtime not found: " + showtimeId));

        List<InventoryItem> items = inventoryRepository
                .findByReferenceIdAndAvailableDateOrderBySeatRowAscSeatNumberAsc(showtimeId, showtime.getShowDate());

        Map<InventoryItem.SeatClass, List<InventoryItem>> byClass = items.stream()
                .collect(Collectors.groupingBy(InventoryItem::getSeatClass, LinkedHashMap::new, Collectors.toList()));

        List<SeatMapResponse.SeatClassSection> sections = SEAT_CLASS_ORDER.stream()
                .filter(byClass::containsKey)
                .map(seatClass -> {
                    List<InventoryItem> classItems = byClass.get(seatClass);
                    Map<String, List<InventoryItem>> byRow = classItems.stream()
                            .collect(Collectors.groupingBy(InventoryItem::getSeatRow, LinkedHashMap::new, Collectors.toList()));

                    List<SeatMapResponse.SeatRow> rows = byRow.entrySet().stream()
                            .map(entry -> SeatMapResponse.SeatRow.builder()
                                    .row(entry.getKey())
                                    .seats(entry.getValue().stream()
                                            .map(i -> SeatMapResponse.Seat.builder()
                                                    .id(i.getId())
                                                    .seatNumber(i.getSeatNumber())
                                                    .label(i.getLabel())
                                                    .status(i.isAvailable() ? "AVAILABLE" : i.getStatus().name())
                                                    .build())
                                            .toList())
                                    .build())
                            .sorted(Comparator.comparing(SeatMapResponse.SeatRow::getRow))
                            .toList();

                    return SeatMapResponse.SeatClassSection.builder()
                            .seatClass(seatClass.name())
                            .price(classItems.get(0).getPrice())
                            .rows(rows)
                            .build();
                })
                .toList();

        return SeatMapResponse.builder()
                .showtimeId(showtimeId)
                .date(showtime.getShowDate())
                .sections(sections)
                .build();
    }

    private MovieSummaryResponse toSummary(Movie movie) {
        return MovieSummaryResponse.builder()
                .id(movie.getId())
                .title(movie.getTitle())
                .posterUrl(movie.getPosterUrl())
                .genre(movie.getGenre())
                .language(movie.getLanguage())
                .durationMinutes(movie.getDurationMinutes())
                .rating(movie.getRating())
                .releaseDate(movie.getReleaseDate())
                .build();
    }
}
