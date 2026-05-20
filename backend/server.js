const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const roomsRoutes = require('./routes/rooms');
const bookingsRoutes = require('./routes/bookings');
const complaintsRoutes = require('./routes/complaints');
const emergenciesRoutes = require('./routes/emergencies');
const feedbackRoutes = require('./routes/feedback');
const staffRoutes = require('./routes/staff');
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');

// API Routes
app.use('/api/rooms', roomsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/emergencies', emergenciesRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Hotel Management API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;
