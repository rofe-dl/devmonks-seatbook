import { request } from './http';

/** Statuses from the server's Prisma `BookingStatus` enum. */
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';

/** A booking row as returned by POST /bookings (201). */
export interface Booking {
  id: number;
  seatId: number;
  userId: number;
  status: BookingStatus;
  createdAt: string;
  cancelledAt: string | null;
}

/** One item of GET /bookings/mine (note: `seat` is the seat label). */
export interface MyBooking {
  id: number;
  status: BookingStatus;
  createdAt: string;
  seat: string;
  event: {
    id: number;
    title: string;
    venue: string;
    startsAt: string;
    price: string;
  };
}

/**
 * GET /bookings/mine
 *
 * The caller's bookings, newest first.
 */
export function getMyBookings(): Promise<MyBooking[]> {
  return request<MyBooking[]>('/bookings/mine', { auth: true });
}

/**
 * POST /bookings
 *
 * Confirms a booking for a seat the caller has reserved.
 * 400 if the seat has no active reservation, 403 if it is held by someone
 * else, 400 if the event has already started.
 */
export function createBooking(seatId: number): Promise<Booking> {
  return request<Booking>('/bookings', { method: 'POST', body: { seatId }, auth: true });
}

/**
 * POST /bookings/:id/cancel
 *
 * Cancels the booking if it belongs to the caller and is still CONFIRMED
 * (a silent no-op otherwise).
 */
export function cancelBooking(bookingId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/bookings/${bookingId}/cancel`, {
    method: 'POST',
    auth: true,
  });
}
