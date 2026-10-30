import { Router } from 'express';
import { Reservation, Seat } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { reserveSeat, getUserEventReservation } from '../services/bookingService';
import { validateBody, createReservationBodySchema } from '../middleware/validators';

const router = Router();

/**
 * Response shape for a reservation: the seat it holds plus the expiry the
 * client needs for its countdown timer.
 */
function reservationPayload(r: Reservation & { seat: Seat }) {
  return {
    id: r.id,
    seatId: r.seatId,
    seat: {
      id: r.seat.id,
      label: r.seat.label,
      row: r.seat.row,
      col: r.seat.col,
    },
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  };
}

router.post('/', requireAuth, validateBody(createReservationBodySchema), async (req: AuthRequest, res) => {
  try {
    // TODO: If user picks seat already reserved or booked, mark it on FE immediately as well
    const { seatId } = req.body;

    if (!req.user?.id) {
      return res.status(500).json({ error: "User ID not found!" });
    }

    const result = await reserveSeat(req.user.id, seatId);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(result.status).json(reservationPayload(result.reservation));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// The caller's active (non-expired) reservation for a specific event, if any.
router.get('/:eventId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const eventId = Number(req.params.eventId);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    if (!req.user?.id) {
      return res.status(500).json({ error: "User ID not found!" });
    }

    const reservation = await getUserEventReservation(req.user.id, eventId);

    if (!reservation) {
      return res.json(null);
    }

    res.json(reservationPayload(reservation));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
