import express from 'express';
import cors from 'cors';
import redis from './redis';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import bookingRoutes from './routes/bookings';
import 'dotenv/config'

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/events', eventRoutes);
app.use('/bookings', bookingRoutes);

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await redis.connect();
  } catch (err) {
    console.error(`[redis] Failed: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Seatbook API running on PORT ${PORT}`);
  });
}

start();

// Graceful shutdown: close Redis when the process exits.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    await redis.disconnect();
    process.exit(0);
  });
}
