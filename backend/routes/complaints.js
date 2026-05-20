const express = require('express');
const router = express.Router();
const { getComplaints, getComplaintById, addComplaint, updateComplaint } = require('../data/store');

// Get all complaints
router.get('/', (req, res) => {
    try {
        const complaints = getComplaints();
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// Get complaint by ID
router.get('/:id', (req, res) => {
    try {
        const complaint = getComplaintById(req.params.id);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch complaint' });
    }
});

// Create new complaint
router.post('/', (req, res) => {
    try {
        const complaint = addComplaint(req.body);
        res.status(201).json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create complaint' });
    }
});

// Update complaint
router.patch('/:id', (req, res) => {
    try {
        const complaint = updateComplaint(req.params.id, req.body);
        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }
        res.json(complaint);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

module.exports = router;
