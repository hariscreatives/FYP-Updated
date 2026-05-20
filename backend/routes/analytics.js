const express = require('express');
const router = express.Router();
const { getAnalytics, getActivity } = require('../data/store');

// Get analytics data
router.get('/', (req, res) => {
    try {
        const analytics = getAnalytics();
        res.json(analytics);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// Get activity feed
router.get('/activity', (req, res) => {
    try {
        const activity = getActivity();
        res.json(activity);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
});

module.exports = router;
