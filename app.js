const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Konfigurasi proxy (Render/Railway) agar rate limit membaca IP asli
app.set('trust proxy', 1);

// Middleware keamanan
app.use(helmet());

// Daftar domain yang diizinkan
const allowedOrigins = [
  'http://localhost:3000',
  'https://toko-online-web.vercel.app',
  /\.vercel\.app$/, // Mengizinkan semua URL Preview Deployments Vercel
];

// Konfigurasi CORS dengan penanganan Regex
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (seperti Postman, Curl, atau server-to-server)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed instanceof RegExp) return allowed.test(origin);
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Diblokir oleh kebijakan CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Pembatas percobaan login/register (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' },
});

// Pendaftaran Rute API
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// Test Route Utama
app.get('/', (req, res) => {
  res.send('API Toko Online Berhasil Jalan');
});

// Handling Error
app.use(notFound);
app.use(errorHandler);

module.exports = app;