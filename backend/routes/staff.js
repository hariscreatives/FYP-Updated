const express = require('express');
const router = express.Router();
const { getStaff, getStaffById, addStaff, updateStaff, deleteStaff } = require('../data/store');

// Get all staff
router.get('/', (req, res) => {
    try {
        const staff = getStaff();
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Get staff by ID
router.get('/:id', (req, res) => {
    try {
        const staff = getStaffById(req.params.id);
        if (!staff) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Create new staff member
router.post('/', (req, res) => {
    try {
        const staff = addStaff(req.body);
        res.status(201).json(staff);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create staff member' });
    }
});

// Update staff member
router.patch('/:id', (req, res) => {
    try {
        const staff = updateStaff(req.params.id, req.body);
        if (!staff) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        res.json(staff);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// Delete staff member
router.delete('/:id', (req, res) => {
    try {
        const deleted = deleteStaff(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Staff not found' });
        }
        res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete staff member' });
    }
});

module.exports = router;
