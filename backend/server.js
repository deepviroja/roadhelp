const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Initialize Firebase
require('./config/firebase');

const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const extraOrigins = String(process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...defaultAllowedOrigins, ...extraOrigins]);

app.disable('x-powered-by');
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const requestRoutes = require('./routes/requestRoutes');
app.use('/api/requests', requestRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Backend running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
