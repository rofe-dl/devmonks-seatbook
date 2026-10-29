import { Event, Seat } from '@prisma/client';
import prisma from '../db';

/** Redis key for a seat's active reservation (value = holder's userId). */
export function seatReservationKey(seatId: number | string): string {
  return `reservation:seat:${seatId}`;
}

/** Redis key for a user's active reservation (value = reserved seatId). */
export function userReservationKey(userId: number | string): string {
  return `reservation:user:${userId}`;
}

export type SeatWithEvent = Seat & { event: Event };

/**
 * Result of validating a seat for booking/reservation.
 * `ok: false` carries the HTTP status and message the route should reply with.
 */
export type SeatCheckResult =
  | { ok: true; seat: SeatWithEvent }
  | { ok: false; status: number; error: string };

/**
 * Loads a seat and checks it is available:
 * the seat exists, the event hasn't started yet, and the seat
 * has no confirmed booking.
 */
export async function checkSeatAvailability(
  seatId: number
): Promise<SeatCheckResult> {
  const [seat, existing] = await Promise.all([
    prisma.seat.findUnique({
      where: { id: seatId },
      include: { event: true },
    }),
    prisma.booking.findFirst({
      where: { seatId, status: 'CONFIRMED' },
    }),
  ]);

  if (!seat) {
    return { ok: false, status: 404, error: 'Seat not found' };
  }

  if (seat.event.startsAt < new Date()) {
    return { ok: false, status: 400, error: 'This event has already started' };
  }

  if (existing) {
    return { ok: false, status: 409, error: 'Seat already booked' };
  }

  return { ok: true, seat };
}
