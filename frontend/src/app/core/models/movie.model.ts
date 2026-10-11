export interface MovieSummary {
  id: string;
  title: string;
  posterUrl: string;
  genre: string;
  language: string;
  durationMinutes: number;
  rating: string;
  releaseDate: string;
}

export interface MovieDetail {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  bannerUrl: string;
  durationMinutes: number;
  genre: string;
  language: string;
  rating: string;
  releaseDate: string;
}

export interface ShowtimeSlot {
  showtimeId: string;
  screenName: string;
  showTime: string;
}

export interface TheaterShowtimes {
  theaterId: string;
  theaterName: string;
  theaterCity: string;
  showtimes: ShowtimeSlot[];
}

export interface ShowtimeDetail {
  id: string;
  movie: MovieSummary;
  theaterId: string;
  theaterName: string;
  theaterCity: string;
  screenName: string;
  showDate: string;
  showTime: string;
}

export interface SeatMapSeat {
  id: string;
  seatNumber: number;
  label: string;
  status: string;
}

export interface SeatMapRow {
  row: string;
  seats: SeatMapSeat[];
}

export interface SeatClassSection {
  seatClass: string;
  price: number;
  rows: SeatMapRow[];
}

export interface SeatMap {
  showtimeId: string;
  date: string;
  sections: SeatClassSection[];
}

/** A seat the user picked in the seat map, carried into the booking-confirm page. */
export interface SelectedSeat {
  id: string;
  label: string;
  seatClass: string;
  price: number;
}
