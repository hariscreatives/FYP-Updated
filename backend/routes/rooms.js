const express = require('express');
const router = express.Router();
const { getRooms, getRoomById, updateRoom } = require('../data/store');

// Get all rooms
router.get('/', (req, res) => {
    try {
        const rooms = getRooms();
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// Get room by ID
router.get('/:id', (req, res) => {
    try {
        const room = getRoomById(req.params.id);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

// Update room (availability, etc.)
router.patch('/:id', (req, res) => {
    try {
        const room = updateRoom(req.params.id, req.body);
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update room' });
    }
});

module.exports = router;
