import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import bookingRoutes from './routes/bookings';
import reservationRoutes from './routes/reservations'
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
app.use('/reservations', reservationRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Seatbook API running on PORT ${PORT}`);
});
