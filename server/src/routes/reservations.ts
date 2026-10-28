
import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { checkSeatAvailability, reservationKey } from '../services/bookingService';
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

    const REDIS_KEY = reservationKey(seatId)
    const REDIS_VALUE = req.user.id.toString()
    const TTL = 600

    const result = await checkSeatAvailability(Number(seatId));

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    const existingReservation = await redisClient.get(REDIS_KEY);

    if (existingReservation) {
      if (existingReservation === req.user.id.toString()) {
        return res.status(204)
      }

      return res.status(409).json({ error: 'This seat has already been reserved' })
    }

    await redisClient.set(REDIS_KEY, REDIS_VALUE, TTL)

    res.status(201);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:seatId', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.id) {
      return res.status(500).json({ error: "User ID not found!" });
    } else if (!req.params.seatId) {
      return res.status(400).json({ error: "Seat ID not found!" });
    }

    const REDIS_KEY = reservationKey(req.params.seatId)

    const existingReservation = await redisClient.get(REDIS_KEY)

    if (existingReservation && existingReservation !== req.user.id.toString()) {
      return res.status(403).json({ error: "Forbidden" })
    }

    await redisClient.del(REDIS_KEY)

    res.status(200);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
