const express = require('express');
const router = express.Router();
const { getUserByEmail, addUser } = require('../data/store');

// Generic Login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = getUserByEmail(email);
        
        if (user && user.password === password) {
            // Exclude password from the returned user object
            const { password: _, ...userWithoutPassword } = user;
            
            res.json({
                success: true,
                user: userWithoutPassword,
                token: 'mock-jwt-token-' + Date.now() // Mock JWT token
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Generic Registration
router.post('/register', (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        
        const existingUser = getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'User already exists' });
        }
        
        const newUser = {
            id: `user-${Date.now()}`,
            name,
            email,
            phone: phone || '',
            password, // Storing plaintext for demo; use bcrypt in production
            role: 'customer' // Default role for open registration
        };
        
        addUser(newUser);
        
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
            success: true,
            user: userWithoutPassword,
            token: 'mock-jwt-token-' + Date.now()
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
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
