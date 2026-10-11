import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/auth/auth.service';
import { Booking } from '../../core/models/booking.model';

@Component({
    selector: 'app-dashboard',
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  bookings = signal<Booking[]>([]);
  loading = signal(true);
  cancelling = signal<string | null>(null);
  page = signal(0);
  totalPages = signal(0);

  constructor(private bookingService: BookingService, public auth: AuthService) {}

  ngOnInit(): void { this.loadBookings(); }

  loadBookings(): void {
    this.loading.set(true);
    this.bookingService.getMyBookings(this.page(), 20).subscribe({
      next: page => {
        this.bookings.set(page.content);
        this.totalPages.set(page.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  cancel(id: string): void {
    this.cancelling.set(id);
    this.bookingService.cancelBooking(id).subscribe({
      next: updated => {
        this.bookings.update(list => list.map(b => b.id === id ? updated : b));
        this.cancelling.set(null);
      },
      error: () => this.cancelling.set(null)
    });
  }

  canCancel(status: string): boolean {
    return ['PENDING', 'INVENTORY_HELD', 'PAYMENT_PROCESSING'].includes(status);
  }

  bookingTypeIcon(type: string): string {
    return '🎬';
  }

  prevPage(): void { this.page.update(p => p - 1); this.loadBookings(); }
  nextPage(): void { this.page.update(p => p + 1); this.loadBookings(); }
}
