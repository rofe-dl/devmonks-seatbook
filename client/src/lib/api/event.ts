import { API_URL } from '../../config';

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
export async function getEvents(params: GetEventsParams = {}): Promise<EventListResult> {
  const { page = 1, limit = 12, search = '' } = params;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const trimmed = search.trim();
  if (trimmed) query.set('search', trimmed);

  const res = await fetch(`${API_URL}/events?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch events (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * GET /events/:id
 *
 * Note: the server responds with HTTP 200 and `{ success: false, message }`
 * for unknown ids, so callers may want to check for `success === false`.
 */
export async function getEvent(id: number | string): Promise<EventDetail> {
  const res = await fetch(`${API_URL}/events/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch event (HTTP ${res.status})`);
  }
  return res.json();
}
