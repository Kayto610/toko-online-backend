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

// di belakang proxy (Render/Railway) agar rate limit membaca IP asli
app.set('trust proxy', 1);

// middleware
app.use(helmet());

// Konfigurasi CORS agar mengizinkan http://localhost:3000
const allowedOrigins = [
  'http://localhost:3000',                     // Environment Lokal (Next.js dev)
  'https://toko-online-web.vercel.app',        // Production Vercel (Domain Utama)
  /\.vercel\.app$/                             // Regex untuk mengizinkan semua Preview Deployments dari Vercel
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// batasi percobaan login/register (anti brute-force)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Terlalu banyak percobaan, coba lagi nanti' },
});

// routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);

// test route utama
app.get('/', (req, res) => {
    res.send('API Toko Online Berhasil Jalan');
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;