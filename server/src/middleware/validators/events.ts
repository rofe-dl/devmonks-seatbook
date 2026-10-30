import { z } from 'zod';

/** Body for POST /events (create an event). */
export const createEventBodySchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters').default(''),
  venue: z.string().trim().min(1, 'Venue is required').max(200, 'Venue must be at most 200 characters'),
  startsAt: z.coerce.date('startsAt must be a valid date'),
  rows: z
    .number()
    .int('rows must be an integer')
    .min(1, 'rows must be at least 1')
    .max(26, 'rows must be at most 26'),
  cols: z
    .number()
    .int('cols must be an integer')
    .min(1, 'cols must be at least 1')
    .max(30, 'cols must be at most 30'),
  priceCents: z
    .number()
    .int('priceCents must be an integer')
    .min(0, 'priceCents must be zero or more')
    .max(10_000_000, 'priceCents must be at most 10000000')
    .default(0),
});

export type CreateEventBody = z.infer<typeof createEventBodySchema>;
