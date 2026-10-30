import { request } from './http';

export interface EventSummary {
  id: number;
  title: string;
  venue: string;
  startsAt: string;
  price: string;
  totalSeats: number;
  seatsLeft: number;
}

export interface EventListResult {
  events: EventSummary[];
  total: number;
  page: number;
  pages: number;
}

export interface EventSeat {
  id: number;
  row: number;
  col: number;
  label: string;
  available: boolean;
}

export interface EventDetail {
  id: number;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  price: string;
  rows: number;
  cols: number;
  organizer: { id: number; name: string };
  seats: EventSeat[];
}

export interface GetEventsParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * GET /events?page=N&limit=N&search=STR
 *
 * Server-side pagination (limit clamped to 1..50, default 12) and
 * case-insensitive search over title + venue.
 */
export function getEvents(params: GetEventsParams = {}): Promise<EventListResult> {
  const { page = 1, limit = 12, search = '' } = params;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const trimmed = search.trim();
  if (trimmed) query.set('search', trimmed);

  return request<EventListResult>(`/events?${query.toString()}`);
}

/**
 * GET /events/:id
 *
 * Note: the server responds with HTTP 200 and `{ success: false, message }`
 * for unknown ids, so callers may want to check for `success === false`.
 */
export function getEvent(id: number | string): Promise<EventDetail> {
  return request<EventDetail>(`/events/${id}`);
}

/** Body for POST /events (mirrors the server's createEventBodySchema). */
export interface CreateEventInput {
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  rows: number;
  cols: number;
  priceCents?: number;
}

/** The event row returned by POST /events (201). */
export interface CreatedEvent {
  id: number;
  title: string;
  description: string;
  venue: string;
  startsAt: string;
  rows: number;
  cols: number;
  priceCents: number;
  organizerId: number;
  createdAt: string;
}

/**
 * POST /events
 *
 * Organizer-only: 403 for other roles, 400 with a validation error message
 * for bad input. Returns the created event row.
 */
export function createEvent(input: CreateEventInput): Promise<CreatedEvent> {
  return request<CreatedEvent>('/events', { method: 'POST', body: input, auth: true });
}
