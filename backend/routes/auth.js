const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ email, password: hashedPassword, name });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Firebase Auth / Google Login Sync
router.post('/firebase-sync', async (req, res) => {
    try {
        const { email, name, photoURL, uid } = req.body;
        console.log("Syncing Firebase User:", email);
        let user = await User.findOne({ email });
        if (!user) {
            user = new User({
                email,
                name: name || email.split('@')[0],
                photoURL,
                uid
            });
            await user.save();
            console.log("Created new sync user:", email);
        } else if (!user.uid || (name && user.name === user.email.split('@')[0])) {
            // Update existing user with UID or better name if they were created via standard register
            user.uid = uid;
            if (name) user.name = name;
            if (photoURL) user.photoURL = photoURL;
            await user.save();
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user._id, email: user.email, name: user.name, photoURL: user.photoURL } });
    } catch (err) {
        console.error("Firebase Sync Error:", err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
