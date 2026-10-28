import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { formatPrice } from '../utils/helpers';
import { checkSeatAvailability, reservationKey } from '../services/bookingService';
import redisClient from '../redis'

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { seatId } = req.body;

    const REDIS_KEY = reservationKey(seatId)
    const existingReservation = await redisClient.get(REDIS_KEY)

    if (!existingReservation) {
      // they should not be able to book a seat directly without having a reservation first
      return res.status(400).json({ error: 'Please reserve the seat before confirming booking' })
    } else if (existingReservation !== req.user?.id.toString()) {
      return res.status(403).json({ error: 'This seat has already been reserved' })
    }

    const result = await checkSeatAvailability(Number(seatId));

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    const booking = await prisma.booking.create({
      data: {
        seatId: result.seat.id,
        userId: req.user!.id,
        status: 'CONFIRMED',
      },
    });

    // TODO: Have some actual logger maybe
    redisClient.del(REDIS_KEY).catch((err) => {
      console.log(err)
    })

    res.status(201).json(booking);
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
  const id = parseInt(req.params.id);

  // TODO: Needs validation and security checks here
  await prisma.booking.updateMany({
    where: { id, status: 'CONFIRMED' },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });

  res.json({ success: true });
});

export default router;
