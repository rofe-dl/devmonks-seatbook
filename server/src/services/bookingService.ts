import { Booking, Event, Prisma, Reservation, Seat } from '@prisma/client';
import prisma from '../db';

export const RESERVATION_TTL_MS = 10 * 60 * 1000;
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

function isExpired(reservation: { expiresAt: Date }): boolean {
  return reservation.expiresAt <= new Date();
}

/**
 * Loads the active reservation on a seat, or null if the seat is free.
 * Expired rows are treated as free; they get cleaned up when the seat is
 * next reserved.
 */
export async function getSeatReservation(
  seatId: number
): Promise<Reservation | null> {
  const reservation = await prisma.reservation.findUnique({ where: { seatId } });
  if (!reservation || isExpired(reservation)) return null;

  return reservation;
}

/**
 * Active reservations for all of an event's seats, keyed by seatId.
 */
export async function getEventReservationHolders(
  eventId: number
): Promise<Map<number, number>> {
  const reservations = await prisma.reservation.findMany({
    where: { eventId, expiresAt: { gt: new Date() } },
    select: { seatId: true, userId: true },
  });

  return new Map(reservations.map((r) => [r.seatId, r.userId]));
}

/**
 * The user's active reservation for a specific event, if any.
 * A user holds at most one reservation per event (unique [userId, eventId]),
 * so this returns null or a single row. Expired rows are ignored.
 */
export async function getUserEventReservation(
  userId: number,
  eventId: number
): Promise<(Reservation & { seat: Seat }) | null> {
  return prisma.reservation.findFirst({
    where: { userId, eventId, expiresAt: { gt: new Date() } },
    include: { seat: true },
  });
}

/**
 * Result of reserving a seat. 204 = idempotent re-reservation of the same seat.
 * On success, `reservation` carries the active row (with seat) so the caller
 * can reply with the expiry details.
 */
export type ReserveResult =
  | { ok: true; status: 201 | 204; reservation: Reservation & { seat: Seat } }
  | { ok: false; status: number; error: string };

/**
 * Reserves a seat for a user.
 * - 204 (idempotent) if the user already holds this seat (no expiry refresh)
 * - 409 if the seat is held by someone else
 * - 201 if the seat is newly reserved (releases any other seat the user
 *   holds in this event; reservations for other events are untouched)
 */
export async function reserveSeat(
  userId: number,
  seatId: number
): Promise<ReserveResult> {
  const result = await checkSeatAvailability(seatId);
  if (!result.ok) return result;
  const eventId = result.seat.eventId;

  // Concurrent reads: what the user holds in this event, and who holds the target seat
  const [eventReservation, seatReservation] = await Promise.all([
    prisma.reservation.findFirst({ where: { userId, eventId }, include: { seat: true } }),
    prisma.reservation.findUnique({ where: { seatId } }),
  ]);

  // Idempotent re-reservation of the same seat (no TTL refresh)
  if (
    eventReservation &&
    !isExpired(eventReservation) &&
    eventReservation.seatId === seatId
  ) {
    return { ok: true, status: 204, reservation: eventReservation };
  }

  if (
    seatReservation &&
    !isExpired(seatReservation) &&
    seatReservation.userId !== userId
  ) {
    return { ok: false, status: 409, error: 'This seat has already been reserved' };
  }

  // Release the user's reservation in this event, if any (different seat or
  // expired), clear any expired row on the target seat, and take the new seat.
  // This is the only place expired rows are deleted: reads just filter on
  // expiresAt, and this transaction removes whatever stale row would block
  // the unique indexes before inserting.
  const operations: Prisma.PrismaPromise<unknown>[] = [];
  if (eventReservation) {
    operations.push(
      prisma.reservation.delete({ where: { id: eventReservation.id } }),
    );
  }
  if (seatReservation) {
    operations.push(
      prisma.reservation.delete({ where: { id: seatReservation.id } }),
    );
  }
  operations.push(
    prisma.reservation.create({
      data: {
        seatId,
        eventId,
        userId,
        expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      },
    }),
  );

  try {
    await prisma.$transaction(operations);
  } catch (err) {
    // Lost a write race: another request reserved the seat (or the event slot)
    // first.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const holder = await getUserEventReservation(userId, eventId);
      if (holder && holder.seatId === seatId) {
        return { ok: true, status: 204, reservation: holder };
      }
      return { ok: false, status: 409, error: 'This seat has already been reserved' };
    }
    throw err;
  }

  // Re-fetch so the response carries the created row (id, createdAt) plus the seat.
  const reservation = await getUserEventReservation(userId, eventId);
  if (!reservation) {
    throw new Error('Failed to load created reservation');
  }
  return { ok: true, status: 201, reservation };
}

/** Result of confirming a booking. */
export type BookResult =
  | { ok: true; booking: Booking }
  | { ok: false; status: number; error: string };

/**
 * Confirms a booking for a seat the user has reserved.
 * - 400 if the seat has no (active) reservation
 * - 403 if the seat is reserved by someone else
 * - 201 + booking on success (the reservation is released in the same transaction)
 *
 * TODO: Add a unique index on (seatId, status) to guard against a race where
 * a booking is created for a seat that already has a confirmed booking.
 */
export async function bookReservedSeat(
  userId: number,
  seatId: number
): Promise<BookResult> {
  const reservation = await getSeatReservation(seatId);

  if (!reservation) {
    // they should not be able to book a seat directly without having a reservation first
    return {
      ok: false,
      status: 400,
      error: 'Please reserve the seat before confirming booking',
    };
  }

  if (reservation.userId !== userId) {
    return { ok: false, status: 403, error: 'This seat has already been reserved' };
  }

  const result = await checkSeatAvailability(seatId);
  if (!result.ok) return result;

  try {
    const [booking] = await prisma.$transaction([
      prisma.booking.create({
        data: {
          seatId,
          userId,
          status: 'CONFIRMED',
        },
      }),
      prisma.reservation.delete({ where: { id: reservation.id } }),
    ]);
    return { ok: true, booking };
  } catch (err) {
    // Lost a write race: the reservation was released (and the seat taken) in the meantime.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      const check = await checkSeatAvailability(seatId);
      if (!check.ok) return check;
      return {
        ok: false,
        status: 400,
        error: 'Please reserve the seat before confirming booking',
      };
    }
    throw err;
  }
}
