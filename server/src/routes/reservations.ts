
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { checkSeatAvailability, seatReservationKey, userReservationKey } from '../services/bookingService';
import redisClient from '../redis'

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    // TODO: When creating booking, check if existing seat is confirmed to prevent race condition, add unique index for that
    // TODO: If user picks seat already reserved or booked, mark it on FE immediately as well
    const { seatId } = req.body;

    if (!req.user?.id) {
      return res.status(500).json({ error: "User ID not found!" });
    }

    const result = await checkSeatAvailability(Number(seatId));

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    const REDIS_KEY_SEAT_TO_USER = seatReservationKey(seatId)
    const REDIS_KEY_USER_TO_SEAT = userReservationKey(req.user.id)
    const TTL = 300 // 5 minutes

    // Concurrent reads: what the user currently holds, and who holds the target seat
    const [currentSeat, seatHolder] = await Promise.all([
      redisClient.get(REDIS_KEY_USER_TO_SEAT),
      redisClient.get(REDIS_KEY_SEAT_TO_USER),
    ])

    // Idempotent re-reservation of the same seat (no TTL refresh)
    if (currentSeat === seatId.toString()) {
      return res.status(204).send()
    }

    if (seatHolder && seatHolder !== req.user.id.toString()) {
      return res.status(409).json({ error: 'This seat has already been reserved' })
    }

    // Release the seat the user currently holds, if any
    if (currentSeat) {
      await redisClient.del(seatReservationKey(currentSeat), REDIS_KEY_USER_TO_SEAT)
    }

    // Take the new seat and point the user at it
    await Promise.all([
      redisClient.set(REDIS_KEY_SEAT_TO_USER, req.user.id.toString(), TTL),
      redisClient.set(REDIS_KEY_USER_TO_SEAT, seatId.toString(), TTL),
    ])

    res.status(201).send()
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
