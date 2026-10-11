import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MovieService } from '../../../core/services/movie.service';
import { MovieDetail, TheaterShowtimes } from '../../../core/models/movie.model';

interface DateOption {
  value: string;   // ISO date
  weekday: string; // "Mon"
  day: string;     // "25"
}

@Component({
    selector: 'app-movie-detail',
    imports: [CommonModule, RouterLink],
    templateUrl: './movie-detail.component.html',
    styleUrl: './movie-detail.component.css'
})
export class MovieDetailComponent implements OnInit {
  movie = signal<MovieDetail | null>(null);
  theaters = signal<TheaterShowtimes[]>([]);
  loadingMovie = signal(true);
  loadingShowtimes = signal(true);
  error = signal('');

  dateOptions: DateOption[] = [];
  selectedDate = signal('');

  private movieId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService
  ) {}

  ngOnInit(): void {
    this.movieId = this.route.snapshot.paramMap.get('movieId')!;
    this.dateOptions = this.buildDateOptions();
    this.selectedDate.set(this.dateOptions[0].value);

    this.movieService.getMovie(this.movieId).subscribe({
      next: movie => {
        this.movie.set(movie);
        this.loadingMovie.set(false);
      },
      error: () => {
        this.error.set('Could not load this movie.');
        this.loadingMovie.set(false);
      }
    });

    this.loadShowtimes();
  }

  selectDate(date: string): void {
    if (date === this.selectedDate()) return;
    this.selectedDate.set(date);
    this.loadShowtimes();
  }

  openShowtime(showtimeId: string): void {
    this.router.navigate(['/showtimes', showtimeId, 'seats']);
  }

  private loadShowtimes(): void {
    this.loadingShowtimes.set(true);
    this.movieService.getShowtimes(this.movieId, this.selectedDate()).subscribe({
      next: theaters => {
        this.theaters.set(theaters);
        this.loadingShowtimes.set(false);
      },
      error: () => {
        this.theaters.set([]);
        this.loadingShowtimes.set(false);
      }
    });
  }

  private buildDateOptions(): DateOption[] {
    const options: DateOption[] = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      options.push({
        value: d.toISOString().split('T')[0],
        weekday: i === 0 ? 'Today' : weekdays[d.getDay()],
        day: String(d.getDate()).padStart(2, '0')
      });
    }
    return options;
  }
}
