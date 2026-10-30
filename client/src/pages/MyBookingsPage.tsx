import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getMyBookings, cancelBooking, MyBooking } from '../lib/api/booking';
import { errorMessage } from '../lib/api/http';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upcoming, setUpcoming] = useState(0);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const loadBookings = () => {
    getMyBookings()
      .then((data) => {
        setBookings(data);

        let spent = 0;
        let up = 0;
        data.forEach((b) => {
          spent += parseFloat(b.event.price.replace('$', ''));
          if (new Date(b.event.startsAt) > new Date()) up++;
        });
        setTotalSpent(spent);
        setUpcoming(up);
      })
      .catch((err) => setToast({ type: 'error', message: `😢 ${errorMessage(err)}` }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async (id: number) => {
    if (!window.confirm('Are you sure you want to cancel? 😢')) return;

    try {
      await cancelBooking(id);
      setToast({ type: 'success', message: 'Booking cancelled successfully! ✅' });
    } catch (err) {
      setToast({ type: 'error', message: `😢 ${errorMessage(err)}` });
    }
    setTimeout(() => setToast(null), 3000);
    loadBookings();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-white/60 animate-pulse">Loading your bookings... 🎟️</p>
      </div>
    );
  }

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

      <h1 className="text-5xl font-extrabold mb-2">
        My <span className="gradient-text">Bookings</span> 🎟️
      </h1>
      <p className="text-white/50 mb-10">All your amazing experiences in one place ✨</p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="glass rounded-2xl p-6">
          <div className="text-white/50 text-sm">Total Bookings</div>
          <div className="text-4xl font-bold gradient-text">{bookings.length}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-white/50 text-sm">Upcoming</div>
          <div className="text-4xl font-bold gradient-text">{upcoming}</div>
        </div>
        <div className="glass rounded-2xl p-6">
          <div className="text-white/50 text-sm">Total Spent</div>
          <div className="text-4xl font-bold gradient-text">${totalSpent.toFixed(2)}</div>
        </div>
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-20 text-white/40">
          <div className="text-6xl">🎭</div>
          <p className="mt-4">No bookings yet!</p>
          <Link to="/" className="text-brand-purple">
            Explore events →
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="glass rounded-2xl p-6 flex items-center justify-between min-w-[760px]">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple via-brand-pink to-brand-orange flex items-center justify-center text-2xl">
                🎭
              </div>
              <div>
                <div className="font-bold text-lg">{b.event.title}</div>
                <div className="text-white/50 text-sm">
                  📍 {b.event.venue} · 📅 {b.event.startsAt.split('T')[0]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple-light text-sm">💺 {b.seat}</span>
              <span className="font-bold">{b.event.price}</span>
              <span className="px-3 py-1 rounded-full bg-success/20 text-success-light text-sm">✓ {b.status}</span>
              <button
                onClick={() => handleCancel(b.id)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-danger to-danger-dark text-sm font-semibold hover:scale-105 transition-all duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
