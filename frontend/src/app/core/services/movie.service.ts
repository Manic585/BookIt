import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MovieDetail,
  MovieSummary,
  SeatMap,
  ShowtimeDetail,
  TheaterShowtimes
} from '../models/movie.model';

@Injectable({ providedIn: 'root' })
export class MovieService {

  constructor(private http: HttpClient) {}

  listMovies(): Observable<MovieSummary[]> {
    return this.http.get<MovieSummary[]>(`${environment.apiUrl}/inventory/movies`);
  }

  getMovie(movieId: string): Observable<MovieDetail> {
    return this.http.get<MovieDetail>(`${environment.apiUrl}/inventory/movies/${movieId}`);
  }

  getShowtimes(movieId: string, date: string): Observable<TheaterShowtimes[]> {
    const params = new HttpParams().set('date', date);
    return this.http.get<TheaterShowtimes[]>(
      `${environment.apiUrl}/inventory/movies/${movieId}/showtimes`, { params });
  }

  getShowtimeDetail(showtimeId: string): Observable<ShowtimeDetail> {
    return this.http.get<ShowtimeDetail>(`${environment.apiUrl}/inventory/showtimes/${showtimeId}`);
  }

  getSeatMap(showtimeId: string): Observable<SeatMap> {
    return this.http.get<SeatMap>(`${environment.apiUrl}/inventory/showtimes/${showtimeId}/seat-map`);
  }
}
