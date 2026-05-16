const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

// Initialize Firebase
require('./config/firebase');

app.use(cors());
app.use(express.json());

const requestRoutes = require('./routes/requestRoutes');
app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

// Diagnostic route — visit /test-firebase to check credentials
app.get('/test-firebase', async (req, res) => {
  try {
    const admin = require('./config/firebase');
    const db = admin.firestore();
    await db.collection('_test').limit(1).get();
    res.json({ success: true, message: 'Firebase connected successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, code: err.code });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));