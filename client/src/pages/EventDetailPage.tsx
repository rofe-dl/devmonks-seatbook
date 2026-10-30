import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { getEvent, EventDetail, EventSeat } from '../lib/api/event';
import { createReservation, getEventReservation } from '../lib/api/reservation';
import { createBooking } from '../lib/api/booking';
import { ApiError, errorMessage } from '../lib/api/http';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [rows, setRows] = useState<EventSeat[][]>([]);
  const [selectedSeat, setSelectedSeat] = useState<EventSeat | null>(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [reservationExpiry, setReservationExpiry] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [error, setError] = useState('');

  const fetchEvent = () => {
    if (!id) return;

    getEvent(id)
      .then((data) => {
        // Unknown ids come back (HTTP 200) as `{ success: false, message }`.
        if (!('seats' in data)) {
          setError((data as { message?: string }).message ?? 'Event not found');
          return;
        }

        setError('');
        setEvent(data);

        const grouped: EventSeat[][] = [];
        data.seats.forEach((seat) => {
          if (!grouped[seat.row]) grouped[seat.row] = [];
          grouped[seat.row].push(seat);
        });
        setRows(grouped);

        setAvailableCount(data.seats.filter((seat) => seat.available).length);
      })
      .catch((err) => {
        if (event) {
          // Re-fetch after a reservation/booking change: keep the seat map, just warn.
          setToast({ type: 'error', message: `😢 ${errorMessage(err)}` });
          setTimeout(() => setToast(null), 3000);
        } else {
          setError(errorMessage(err));
        }
      });
  };

  const fetchUserReservations = () => {
    if (!id || !localStorage.getItem('token')) return;

    getEventReservation(id)
      .then((reservation) => {
        if (reservation) {
          // The held seat shows up as unavailable in the event payload.
          setSelectedSeat({ ...reservation.seat, available: false });
          setReservationExpiry(new Date(reservation.expiresAt).getTime());
        }
      })
      .catch((err) => {
        // 401 is expected for anonymous visitors (the page is public);
        // surface anything else.
        if (err instanceof ApiError && err.status === 401) return;
        setToast({ type: 'error', message: `😢 ${errorMessage(err)}` });
        setTimeout(() => setToast(null), 3000);
      });
  }

  useEffect(() => {
    fetchEvent();
    fetchUserReservations();
  }, [id]);

  useEffect(() => {
    if (reservationExpiry === null) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((reservationExpiry - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setReservationExpiry(null);
        setSelectedSeat(null);
        setToast({ type: 'error', message: '⏰ Your reservation expired - pick a seat!' });
        setTimeout(() => setToast(null), 3000);
        fetchEvent();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservationExpiry]);

  const handleReservation = async (seat: EventSeat) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    setSelectedSeat(seat);

    try {
      const reservation = await createReservation(seat.id);
      setReservationExpiry(new Date(reservation.expiresAt).getTime());
      fetchEvent();
    } catch (err) {
      setToast({ type: 'error', message: `😢 ${errorMessage(err)}` });
      setTimeout(() => setToast(null), 3000);
      setSelectedSeat(null);
    }
  }

  const handleBook = async () => {
    if (!selectedSeat) {
      setToast({ type: 'error', message: 'Please select a seat first! 🪑' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await createBooking(selectedSeat.id);
      setToast({ type: 'success', message: `🎉 Woohoo! Seat ${selectedSeat.label} is yours!` });
      setTimeout(() => setToast(null), 3000);
      setSelectedSeat(null);
      fetchEvent();
    } catch (err) {
      setToast({ type: 'error', message: `😢 ${errorMessage(err)}` });
      setTimeout(() => setToast(null), 3000);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="text-6xl">😢</div>
        <p className="mt-6 text-white/60">{error}</p>
        <button
          onClick={() => {
            setError('');
            fetchEvent();
          }}
          className="mt-8 px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange font-bold hover:scale-105 transition-all duration-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-white/60 animate-pulse">Loading event... 🎭</p>
      </div>
    );
  }

  const price = parseFloat(event.price.replace('$', ''));
  const serviceFee = price * 0.05;
  const total = price + serviceFee;
  const isPast = new Date(event.startsAt) < new Date();
  const percentBooked = Math.round(((event.seats.length - availableCount) / event.seats.length) * 100);

  return (
    <div>
      {toast && (
        <div
          className={`fixed top-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl font-medium ${toast.type === 'success'
            ? 'bg-gradient-to-r from-success to-success-dark'
            : 'bg-gradient-to-r from-danger to-danger-dark'
            }`}
        >
          {toast.message}
        </div>
      )}

      <div className="rounded-3xl p-10 bg-gradient-to-br from-brand-purple/30 via-brand-pink/20 to-brand-orange/20 border border-white/10 glow">
        <span className="px-3 py-1 rounded-full bg-brand-purple/30 text-brand-purple-light text-xs font-bold">
          {isPast ? '⏰ ENDED' : '✨ LIVE NOW'}
        </span>
        <h1 className="mt-4 text-5xl font-extrabold">{event.title}</h1>
        <p className="mt-4 text-white/60 text-lg">{event.description}</p>
        <div className="mt-6 flex gap-6 text-white/70">
          <span>📍 {event.venue}</span>
          <span>📅 {new Date(event.startsAt).toDateString()}</span>
          <span>👤 {event.organizer.name}</span>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-8">
        <div className="col-span-2 glass rounded-3xl p-8">
          <h2 className="text-2xl font-bold mb-2">
            Choose Your <span className="gradient-text">Perfect Seat</span> 🪑
          </h2>
          <p className="text-white/50 mb-6">
            {availableCount} of {event.seats.length} available · {percentBooked}% booked 🔥
          </p>
          <div className="w-full h-2 rounded-full bg-gradient-to-r from-brand-purple to-brand-pink mb-10 opacity-60"></div>
          {reservationExpiry !== null && selectedSeat && (
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-brand-pink/40 bg-gradient-to-r from-brand-pink/15 to-brand-orange/15 px-5 py-4">
              <span className="text-sm font-semibold text-white/80">
                🪑 Seat {selectedSeat.label} is held - finish booking before it drops!
              </span>
              <span className={`font-mono text-2xl font-bold ${timeLeft <= 60 ? 'animate-pulse text-red-400' : 'text-brand-pink-light'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          )}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex gap-3 justify-center">
                {row.map((seat) => (
                  <div
                    key={seat.id}
                    onClick={() => handleReservation(seat)}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-300 hover:scale-110 ${selectedSeat?.id === seat.id
                      ? 'bg-gradient-to-br from-brand-pink to-brand-orange shadow-lg shadow-brand-pink/50 scale-110'
                      : seat.available
                        ? 'bg-gradient-to-br from-brand-purple/60 to-brand-indigo/60 hover:from-brand-purple hover:to-brand-indigo'
                        : 'bg-gradient-to-br from-brand-purple/20 to-brand-indigo/20 text-white/30'
                      }`}
                  >
                    {seat.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-8 h-fit">
          <h3 className="text-xl font-bold mb-6">Order Summary 🧾</h3>
          <div className="space-y-4 text-white/70">
            <div className="flex justify-between">
              <span>Seat</span>
              <span className="font-bold text-white">{selectedSeat ? selectedSeat.label : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Ticket</span>
              <span>${price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service fee (5%)</span>
              <span>${serviceFee.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-4 flex justify-between text-xl font-bold text-white">
              <span>Total</span>
              <span className="gradient-text">${total.toFixed(2)}</span>
            </div>
          </div>
          <button
            onClick={handleBook}
            className="mt-8 w-full py-4 rounded-2xl bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange font-bold text-lg hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-pink/40 transition-all duration-300"
          >
            Book Now 🎟️
          </button>
          <p className="mt-4 text-center text-xs text-white/40">🔒 Secure checkout · Instant confirmation</p>
        </div>
      </div>
    </div>
  );
}
