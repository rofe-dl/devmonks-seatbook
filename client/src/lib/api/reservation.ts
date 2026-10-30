import { request } from './http';

/** The seat a reservation holds, as embedded in reservation payloads. */
export interface ReservationSeat {
  id: number;
  label: string;
  row: number;
  col: number;
}

/**
 * Response shape for a reservation: the seat it holds plus the expiry the
 * client needs for its countdown timer.
 */
export interface Reservation {
  id: number;
  seatId: number;
  seat: ReservationSeat;
  expiresAt: string;
  createdAt: string;
}

/**
 * POST /reservations
 *
 * Reserves a seat for the caller (10-minute hold).
 * 201 on a fresh reservation, 204 (idempotent) if the caller already holds
 * the seat; 409 if the seat is held by someone else, 400 if the event has
 * already started or the seat is booked.
 */
export function createReservation(seatId: number): Promise<Reservation> {
  return request<Reservation>('/reservations', { method: 'POST', body: { seatId }, auth: true });
}

/**
 * GET /reservations/:eventId
 *
 * The caller's active (non-expired) reservation for the event, or null.
 */
export function getEventReservation(eventId: number | string): Promise<Reservation | null> {
  return request<Reservation | null>(`/reservations/${eventId}`, { auth: true });
}
