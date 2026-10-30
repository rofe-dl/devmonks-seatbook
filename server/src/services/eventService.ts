import { Request } from 'express';
import prisma from '../db';
import { formatPrice, isSeatBookable } from '../utils/helpers';

export interface ListEventsParams {
  page: number;
  limit: number;
  search?: string;
}

export async function listEvents({ page, limit, search }: ListEventsParams) {
  const where = search
    ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { venue: { contains: search, mode: 'insensitive' as const } },
      ],
    }
    : {};

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { seats: { include: { bookings: true, reservations: true } } },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      venue: event.venue,
      startsAt: event.startsAt,
      price: formatPrice(event.priceCents),
      totalSeats: event.seats.length,
      seatsLeft: event.seats.filter((seat) => isSeatBookable(seat, event)).length,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

export async function getEventWithSeats(req: Request) {
  const id = parseInt(req.params.id);

  return prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true } },
      seats: {
        orderBy: [{ row: 'asc' }, { col: 'asc' }],
        include: { bookings: { where: { status: 'CONFIRMED' } } },
      },
    },
  });
}
