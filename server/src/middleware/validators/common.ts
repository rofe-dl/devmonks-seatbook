import { z } from 'zod';

/**
 * Shared field schema for routes that take a single seat id in the body
 * (reserving a seat, confirming a booking).
 */
export const seatId = z
  .coerce.number('seatId must be a number')
  .int('seatId must be an integer')
  .min(1, 'seatId must be a positive integer')
  .max(2_147_483_647, 'seatId is too large'); // Prisma Int (32-bit) upper bound
