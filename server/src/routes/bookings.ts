import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { formatPrice } from '../utils/helpers';
import { bookReservedSeat } from '../services/bookingService';
import { validateBody, createBookingBodySchema } from '../middleware/validators';

const router = Router();

router.post('/', requireAuth, validateBody(createBookingBodySchema), async (req: AuthRequest, res) => {
  try {
    const { seatId } = req.body;

    const result = await bookReservedSeat(req.user!.id, seatId);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json(result.booking);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: { seat: { include: { event: true } } },
    });

    res.json(
      bookings.map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        seat: b.seat.label,
        event: {
          id: b.seat.event.id,
          title: b.seat.event.title,
          venue: b.seat.event.venue,
          startsAt: b.seat.event.startsAt,
          price: formatPrice(b.seat.event.priceCents),
        },
      }))
    );
  } catch (err) {
    console.log(err);
    res.json([]);
  }
});

router.post('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.booking.updateMany({
      where: { id, status: 'CONFIRMED', userId: req.user!.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
