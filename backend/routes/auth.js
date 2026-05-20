const express = require('express');
const router = express.Router();
const { getStaff } = require('../data/store');

// Mock authentication - in production, use proper authentication with JWT/passwords
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Mock credentials (for demo purposes)
        const validCredentials = {
            'admin@grandhotel.com': { password: 'admin123', role: 'Admin' },
            'alice@grandhotel.com': { password: 'staff123', role: 'Staff' },
        };
        
        if (validCredentials[email] && validCredentials[email].password === password) {
            const staff = getStaff().find(s => s.email === email);
            res.json({
                success: true,
                user: staff || {
                    id: 'demo-user',
                    email,
                    role: validCredentials[email].role,
                    name: email.split('@')[0]
                },
                token: 'mock-jwt-token-' + Date.now() // Mock JWT token
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Verify token (mock)
router.get('/verify', (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token && token.startsWith('mock-jwt-token-')) {
            res.json({ valid: true });
        } else {
            res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

module.exports = router;
