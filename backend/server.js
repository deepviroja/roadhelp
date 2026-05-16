const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const requestRoutes = require('./routes/requestRoutes');

app.use('/api/requests', requestRoutes);

app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
