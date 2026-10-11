import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';
import { SelectedSeat, ShowtimeDetail } from '../../../core/models/movie.model';

interface SeatBookingResult {
  seat: SelectedSeat;
  booking?: Booking;
  error?: string;
}

@Component({
    selector: 'app-booking-confirm',
    imports: [CommonModule, RouterLink],
    templateUrl: './booking-confirm.component.html',
    styleUrl: './booking-confirm.component.css'
})
export class BookingConfirmComponent implements OnInit {
  showtime: ShowtimeDetail | null = null;
  seats: SelectedSeat[] = [];
  date = '';

  totalAmount = computed(() => this.seats.reduce((sum, s) => sum + s.price, 0));

  results = signal<SeatBookingResult[] | null>(null);
  loading = signal(false);
  error = signal('');

  constructor(private router: Router, private bookingService: BookingService) {}

  ngOnInit(): void {
    const state = (this.router.getCurrentNavigation()?.extras.state ?? history.state) as any;
    if (!state?.showtime || !state?.seats?.length) {
      this.router.navigate(['/movies']);
      return;
    }
    this.showtime = state.showtime;
    this.seats = state.seats;
    this.date = state.date;
  }

  confirm(): void {
    if (!this.showtime || this.seats.length === 0) return;
    this.loading.set(true);
    this.error.set('');

    const requests = this.seats.map(seat =>
      this.bookingService.createBooking({
        referenceId: this.showtime!.id,
        bookingType: 'CINEMA',
        inventoryItemId: seat.id,
        bookingDate: this.date,
        totalAmount: seat.price
      }).pipe(
        catchError(err => of({ __error: err.error?.detail || 'Booking failed' }))
      )
    );

    forkJoin(requests).subscribe(responses => {
      const results: SeatBookingResult[] = responses.map((res: any, i) =>
        res.__error
          ? { seat: this.seats[i], error: res.__error }
          : { seat: this.seats[i], booking: res as Booking }
      );
      this.results.set(results);
      this.loading.set(false);
    });
  }

  get allSucceeded(): boolean {
    const r = this.results();
    return !!r && r.every(x => !x.error);
  }
}
