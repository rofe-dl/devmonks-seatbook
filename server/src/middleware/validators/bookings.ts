import { z } from 'zod';
import { seatId } from './common';

/** Body for POST /bookings: confirm a booking for a reserved seat. */
export const createBookingBodySchema = z.object({ seatId });

export type CreateBookingBody = z.infer<typeof createBookingBodySchema>;
