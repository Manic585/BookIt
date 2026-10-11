package com.bookingsystem.inventory.repository;

import com.bookingsystem.inventory.domain.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {

    List<Showtime> findByMovieIdAndShowDateOrderByShowTime(UUID movieId, LocalDate showDate);
}
