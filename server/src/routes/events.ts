import { Router } from 'express';
import prisma from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getEventWithSeats, listEvents } from '../services/eventService';
import { getEventReservationHolders } from '../services/bookingService';
import { formatPrice, seatLabel } from '../utils/helpers';
import { validateBody, createEventBodySchema } from '../middleware/validators';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 12));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const result = await listEvents({ page, limit, search: search || undefined });
    res.json(result);
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await getEventWithSeats(req);

    if (!event) {
      return res.json({ success: false, message: 'Event not found' });
    }

    // Merge active reservations (DB) with confirmed bookings (DB).
    const holders = await getEventReservationHolders(event.id);

    const seats = event.seats.map((seat) => ({
      id: seat.id,
      row: seat.row,
      col: seat.col,
      label: seat.label,
      available: seat.bookings.length === 0 && !holders.has(seat.id),
    }));

    res.json({
      id: event.id,
      title: event.title,
      description: event.description,
      venue: event.venue,
      startsAt: event.startsAt,
      price: formatPrice(event.priceCents),
      rows: event.rows,
      cols: event.cols,
      organizer: event.organizer,
      seats,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, validateBody(createEventBodySchema), async (req: AuthRequest, res) => {
  if (req.user!.role !== 'ORGANIZER') {
    return res.status(403).json({ error: 'Only organizers can create events' });
  }

  try {
    // Validated by createEventBodySchema: required fields present, rows/cols
    // within limits, startsAt coerced to a Date, priceCents defaulted to 0.
    const { title, description, venue, startsAt, rows, cols, priceCents } = req.body;

    const seats = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seats.push({ row: r, col: c, label: seatLabel(r, c) });
      }
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        venue,
        startsAt,
        rows,
        cols,
        priceCents,
        organizerId: req.user!.id,
        seats: { create: seats },
      },
    });

    res.status(201).json(event);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
