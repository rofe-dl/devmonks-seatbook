import { Booking, Event, Reservation, Seat } from '@prisma/client';

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function seatLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`;
}

export function isSeatBookable(seat: Seat & { bookings: Booking[], reservations: Reservation[] }, event: Event): boolean {
  if (new Date(event.startsAt) < new Date()) {
    return false;
  }

  const now = new Date()

  const isReserved = seat.reservations.some((reservation) => reservation.expiresAt >= now)
  if (isReserved) return false;

  const isBooked = seat.bookings.some((booking) => booking.status === 'CONFIRMED')
  if (isBooked) return false;

  return true;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
