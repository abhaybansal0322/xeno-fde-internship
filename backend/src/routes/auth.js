// Authentication routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const bcrypt = require('bcryptjs');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format',
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters',
            });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email already exists',
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
            },
        });

        res.status(201).json({
            message: 'User created successfully',
            user,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Failed to register user',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return user data
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required',
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password',
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password',
            });
        }

        // Return user data (without password)
        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Failed to authenticate user',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

module.exports = router;

