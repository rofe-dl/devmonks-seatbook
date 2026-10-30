import { z } from 'zod';

/** Body for POST /auth/register. */
export const registerBodySchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254, 'Email must be at most 254 characters'),
  // Deliberately not trimmed: surrounding whitespace is part of the credential.
  // max 72: bcryptjs only hashes the first 72 bytes.
  password: z.string().min(1, 'Password is required').max(72, 'Password must be at most 72 characters'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  role: z.enum(['ORGANIZER', 'ATTENDEE']).optional(),
});

/** Body for POST /auth/login. */
export const loginBodySchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254, 'Email must be at most 254 characters'),
  password: z.string().min(1, 'Password is required').max(72, 'Password must be at most 72 characters'),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
