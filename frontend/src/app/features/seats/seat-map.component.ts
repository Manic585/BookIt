import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MovieService } from '../../core/services/movie.service';
import { SeatMap, SelectedSeat, ShowtimeDetail } from '../../core/models/movie.model';

const MAX_SEATS = 10;

@Component({
    selector: 'app-seat-map',
    imports: [CommonModule, RouterLink],
    templateUrl: './seat-map.component.html',
    styleUrl: './seat-map.component.css'
})
export class SeatMapComponent implements OnInit {
  showtime = signal<ShowtimeDetail | null>(null);
  seatMap = signal<SeatMap | null>(null);
  loading = signal(true);
  error = signal('');

  selectedSeats = signal<SelectedSeat[]>([]);
  totalPrice = computed(() => this.selectedSeats().reduce((sum, s) => sum + s.price, 0));
  maxSeats = MAX_SEATS;

  private showtimeId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService
  ) {}

  ngOnInit(): void {
    this.showtimeId = this.route.snapshot.paramMap.get('showtimeId')!;

    this.movieService.getShowtimeDetail(this.showtimeId).subscribe({
      next: s => this.showtime.set(s),
      error: () => this.error.set('Could not load showtime details.')
    });

    this.movieService.getSeatMap(this.showtimeId).subscribe({
      next: map => {
        this.seatMap.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load the seat map.');
        this.loading.set(false);
      }
    });
  }

  isSelected(seatId: string): boolean {
    return this.selectedSeats().some(s => s.id === seatId);
  }

  toggleSeat(seatId: string, label: string, seatClass: string, price: number, status: string): void {
    if (status !== 'AVAILABLE') return;

    const current = this.selectedSeats();
    if (this.isSelected(seatId)) {
      this.selectedSeats.set(current.filter(s => s.id !== seatId));
      return;
    }
    if (current.length >= MAX_SEATS) return;
    this.selectedSeats.set([...current, { id: seatId, label, seatClass, price }]);
  }

  proceed(): void {
    const showtime = this.showtime();
    const seats = this.selectedSeats();
    const map = this.seatMap();
    if (!showtime || !map || seats.length === 0) return;

    this.router.navigate(['/booking/confirm'], {
      state: { showtime, seats, date: map.date }
    });
  }
}
