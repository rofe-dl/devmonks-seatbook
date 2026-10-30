import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { createEvent } from '../lib/api/event';
import { errorMessage } from '../lib/api/http';

export default function CreateEventPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(8);
  const [price, setPrice] = useState('0');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const event = await createEvent({
        title,
        description,
        venue,
        startsAt: new Date(startsAt).toISOString(),
        rows: Number(rows),
        cols: Number(cols),
        priceCents: Math.round(parseFloat(price) * 100),
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const previewRows = [];
  for (let r = 0; r < Number(rows); r++) {
    const seats = [];
    for (let c = 0; c < Number(cols); c++) {
      seats.push(String.fromCharCode(65 + r) + (c + 1));
    }
    previewRows.push(seats);
  }

  return (
    <div>
      <h1 className="text-5xl font-extrabold mb-2">
        Create <span className="gradient-text">Event</span> ✨
      </h1>
      <p className="text-white/50 mb-10">Bring people together for something amazing 🎉</p>

      <div className="grid grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-4">
          <input
            placeholder="🎭 Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
          />
          <textarea
            placeholder="📝 Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
          />
          <input
            placeholder="📍 Venue"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
          />
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
          />
          <div className="grid grid-cols-3 gap-4">
            <input
              type="number"
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
            />
            <input
              type="number"
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
            />
            <input
              placeholder="💰 Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-purple transition-all duration-300"
            />
          </div>
          {error && <p className="text-danger-light text-sm">⚠️ {error}</p>}
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-purple via-brand-pink to-brand-orange font-bold text-lg hover:scale-[1.02] hover:shadow-2xl hover:shadow-brand-pink/40 transition-all duration-300"
          >
            Launch Event 🚀
          </button>
        </form>

        <div className="glass rounded-3xl p-8">
          <h3 className="text-xl font-bold mb-6">Live Preview 👀</h3>
          <div className="space-y-3">
            {previewRows.map((row, i) => (
              <div key={i} className="flex gap-3 justify-center">
                {row.map((label) => (
                  <div
                    key={label}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold bg-gradient-to-br from-brand-purple/60 to-brand-indigo/60"
                  >
                    {label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
