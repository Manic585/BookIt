export interface CreateBookingRequest {
  referenceId: string;
  bookingType: 'CINEMA';
  inventoryItemId: string;
  bookingDate: string;
  totalAmount: number;
  idempotencyKey: string;
}

export interface Booking {
  id: string;
  userId: string;
  referenceId: string;
  bookingType: string;
  inventoryItemId: string;
  bookingDate: string;
  status: 'PENDING' | 'INVENTORY_HELD' | 'PAYMENT_PROCESSING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';
  totalAmount: number;
  idempotencyKey: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}
