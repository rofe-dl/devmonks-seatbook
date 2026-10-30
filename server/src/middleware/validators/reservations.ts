import { z } from 'zod';
import { seatId } from './common';

/** Body for POST /reservations: reserve a seat. */
export const createReservationBodySchema = z.object({ seatId });

export type CreateReservationBody = z.infer<typeof createReservationBodySchema>;
