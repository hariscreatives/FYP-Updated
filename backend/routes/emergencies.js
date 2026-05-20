const express = require('express');
const router = express.Router();
const { getEmergencies, getEmergencyById, addEmergency, updateEmergency } = require('../data/store');

// Get all emergencies
router.get('/', (req, res) => {
    try {
        const emergencies = getEmergencies();
        res.json(emergencies);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch emergencies' });
    }
});

// Get emergency by ID
router.get('/:id', (req, res) => {
    try {
        const emergency = getEmergencyById(req.params.id);
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }
        res.json(emergency);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch emergency' });
    }
});

// Create new emergency
router.post('/', (req, res) => {
    try {
        const emergency = addEmergency(req.body);
        res.status(201).json(emergency);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create emergency' });
    }
});

// Update emergency
router.patch('/:id', (req, res) => {
    try {
        const emergency = updateEmergency(req.params.id, req.body);
        if (!emergency) {
            return res.status(404).json({ error: 'Emergency not found' });
        }
        res.json(emergency);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update emergency' });
    }
});

module.exports = router;
