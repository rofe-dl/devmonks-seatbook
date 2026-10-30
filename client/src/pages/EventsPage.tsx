import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { getEvents, EventSummary } from '../lib/api/event';

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function getPageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const items: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('ellipsis');
  items.push(total);

  return items;
}

interface EventsQuery {
  page: number;
  search: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [query, setQuery] = useState<EventsQuery>({ page: 1, search: '' });
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const requestId = useRef(0);
  const hasLoaded = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // When the debounced search settles, reset to page 1 (no-op if unchanged).
  useEffect(() => {
    setQuery((q) => (q.search === debouncedSearch ? q : { page: 1, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    const reqId = ++requestId.current;
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);

    getEvents({ page: query.page, limit: PAGE_SIZE, search: query.search })
      .then((data) => {
        if (reqId !== requestId.current) return;
        setEvents(data.events);
        setTotal(data.total);
        setPages(data.pages);
        setError('');
      })
      .catch(() => {
        if (reqId !== requestId.current) return;
        setError('Oops! Something went wrong 😢');
      })
      .finally(() => {
        if (reqId !== requestId.current) return;
        hasLoaded.current = true;
        setLoading(false);
        setRefreshing(false);
      });
  }, [query]);

  const gotoPage = (page: number) => {
    if (page < 1 || page > pages || page === query.page) return;
    setQuery((q) => ({ ...q, page }));
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-white/60 animate-pulse">Loading amazing events... ✨</p>
      </div>
    );
  }

  const featured = events[0];
  const seatsOnPage = events.reduce((sum, e) => sum + e.seatsLeft, 0);

  return (
    <div>
      <section className="text-center py-16">
        <span className="px-4 py-1 rounded-full bg-brand-purple/20 text-brand-purple-light text-sm font-medium">
          🚀 The future of seat booking
        </span>
        <h1 className="mt-6 text-6xl font-extrabold leading-tight">
          Discover <span className="gradient-text">Amazing</span> Events
        </h1>
        <p className="mt-4 text-xl text-white/60 max-w-2xl mx-auto">
          Book your perfect seat in seconds. Seamless, effortless, and powered by cutting-edge technology. 🎉
        </p>
        <div className="mt-10 flex justify-center gap-6">
          <div className="glass rounded-2xl px-8 py-5">
            <div className="text-3xl font-bold gradient-text">{total}</div>
            <div className="text-white/50 text-sm">Events</div>
          </div>
          <div className="glass rounded-2xl px-8 py-5">
            <div className="text-3xl font-bold gradient-text">{seatsOnPage}</div>
            <div className="text-white/50 text-sm">Seats on this Page</div>
          </div>
          <div className="glass rounded-2xl px-8 py-5">
            <div className="text-3xl font-bold gradient-text">100%</div>
            <div className="text-white/50 text-sm">Satisfaction</div>
          </div>
        </div>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="🔍 Search events..."
          className="mt-10 w-full max-w-xl px-6 py-4 rounded-2xl glass text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-purple"
        />
      </section>

      {error && (
        <div className="mb-8 p-4 rounded-2xl bg-danger/20 border border-danger/40 text-danger-light">{error}</div>
      )}

      {featured && (
        <Link to={`/events/${featured.id}`}>
          <div className="mb-12 p-10 rounded-3xl bg-gradient-to-br from-brand-purple/30 via-brand-pink/20 to-brand-orange/20 border border-white/10 hover:scale-[1.01] transition-all duration-500 glow">
            <span className="px-3 py-1 rounded-full bg-brand-orange text-xs font-bold">🔥 FEATURED</span>
            <h2 className="mt-4 text-4xl font-bold">{featured.title}</h2>
            <p className="mt-2 text-white/60">📍 {featured.venue}</p>
            <p className="text-white/60">
              📅{' '}
              {new Date(featured.startsAt).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <span className="text-3xl font-extrabold gradient-text">{featured.price}</span>
              <span className="px-3 py-1 rounded-full bg-success/20 text-success-light text-sm">
                {featured.seatsLeft} seats left
              </span>
            </div>
          </div>
        </Link>
      )}

      <div ref={gridRef} className="scroll-mt-24">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">
            All <span className="gradient-text">Events</span> 🎊
          </h2>
          <div className="flex items-center gap-3">
            {refreshing && (
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
            )}
            {pages > 1 && (
              <span className="text-white/40 text-sm">
                Page {query.page} of {pages}
              </span>
            )}
          </div>
        </div>
        <div className={refreshing ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-3 gap-6">
            {events.map((event) => (
              <Link to={`/events/${event.id}`} key={event.id}>
                <div className="glass rounded-3xl p-6 hover:scale-105 hover:shadow-2xl hover:shadow-brand-purple/20 transition-all duration-300 h-full">
                  <div className="h-32 rounded-2xl bg-gradient-to-br from-brand-purple via-brand-pink to-brand-orange flex items-center justify-center text-5xl animate-float">
                    🎭
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{event.title}</h3>
                  <p className="mt-1 text-white/50 text-sm">📍 {event.venue}</p>
                  <p className="text-white/50 text-sm">
                    📅{' '}
                    {new Date(event.startsAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-2xl font-extrabold gradient-text">{event.price}</span>
                    <span className="px-3 py-1 rounded-full bg-success/20 text-success-light text-sm">
                      {event.seatsLeft} seats left
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {events.length === 0 && (
            <div className="text-center py-20 text-white/40">
              <div className="text-6xl">🤷</div>
              <p className="mt-4">No events found</p>
            </div>
          )}
        </div>
      </div>

      {pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => gotoPage(query.page - 1)}
            disabled={query.page <= 1}
            className="glass rounded-xl px-4 py-2 text-white/70 hover:ring-2 hover:ring-brand-purple focus:outline-none disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            ‹ Prev
          </button>
          {getPageItems(query.page, pages).map((item, i) =>
            typeof item === 'number' ? (
              <button
                key={item}
                onClick={() => gotoPage(item)}
                className={
                  item === query.page
                    ? 'rounded-xl px-4 py-2 bg-brand-purple text-white font-bold'
                    : 'glass rounded-xl px-4 py-2 text-white/70 hover:ring-2 hover:ring-brand-purple focus:outline-none transition-all'
                }
              >
                {item}
              </button>
            ) : (
              <span key={`ellipsis-${i}`} className="px-1 text-white/40">
                ...
              </span>
            )
          )}
          <button
            onClick={() => gotoPage(query.page + 1)}
            disabled={query.page >= pages}
            className="glass rounded-xl px-4 py-2 text-white/70 hover:ring-2 hover:ring-brand-purple focus:outline-none disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            Next ⟩
          </button>
        </div>
      )}
    </div>
  );
}
