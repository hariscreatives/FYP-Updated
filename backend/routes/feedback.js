const express = require('express');
const router = express.Router();
const { getFeedback, addFeedback } = require('../data/store');

// Get all feedback
router.get('/', (req, res) => {
    try {
        const feedback = getFeedback();
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Create new feedback
router.post('/', (req, res) => {
    try {
        const feedback = addFeedback(req.body);
        res.status(201).json(feedback);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create feedback' });
    }
});

module.exports = router;
