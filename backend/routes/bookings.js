const express = require('express');
const router = express.Router();
const { getBookings, getBookingById, addBooking, updateBooking } = require('../data/store');

// Get all bookings
router.get('/', (req, res) => {
    try {
        const bookings = getBookings();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
});

// Get booking by ID
router.get('/:id', (req, res) => {
    try {
        const booking = getBookingById(req.params.id);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch booking' });
    }
});

// Create new booking
router.post('/', (req, res) => {
    try {
        const booking = addBooking(req.body);
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create booking' });
    }
});

// Update booking
router.patch('/:id', (req, res) => {
    try {
        const booking = updateBooking(req.params.id, req.body);
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        res.json(booking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update booking' });
    }
});

module.exports = router;
