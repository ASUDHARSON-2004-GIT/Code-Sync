const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const mongoose = require('mongoose');


// Create Room
router.post('/create', async (req, res) => {
    try {
        const { name, userId, password } = req.body;
        const roomId = uuidv4().substring(0, 8);
        const defaultFileId = uuidv4();

        let savedPassword = null;
        if (password) {
            savedPassword = password;
        }

        const newRoom = new Room({
            roomId,
            name,
            password: savedPassword,
            owner: userId,
            collaborators: [{ user: userId, role: 'owner' }],
            files: [{
                id: defaultFileId,
                name: 'main.js',
                type: 'file',
                content: "// Start coding here...",
                language: 'javascript',
                parentId: null
            }],
            activeFileId: defaultFileId
        });
        await newRoom.save();
        res.json(newRoom);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Join Room (Add user as collaborator)
router.post('/join', async (req, res) => {
    const { roomId, userId, password } = req.body;
    try {
        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        const isOwner = room.owner.toString() === userId;
        const isCollaborator = room.collaborators.some(c => c.user.toString() === userId);

        if (!isOwner && !isCollaborator) {
            if (room.password) {
                if (!password) {
                    return res.status(401).json({ message: "Password required to join this room." });
                }
                
                let isMatch = false;
                if (room.password.startsWith('$2a$') || room.password.startsWith('$2b$')) {
                    isMatch = await bcrypt.compare(password, room.password).catch(() => false);
                } else {
                    isMatch = (room.password === password);
                }

                if (!isMatch) {
                    return res.status(401).json({ message: "Invalid password." });
                }
            }

            room.collaborators.push({ user: userId, role: 'editor' });
            await room.save();
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get User's Rooms
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        let query;

        if (mongoose.Types.ObjectId.isValid(userId)) {
            query = {
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId }
                ]
            };
        } else {
            // If it's a Firebase UID, we first need to find the user in our DB
            const user = await User.findOne({ uid: userId });
            if (!user) return res.json([]); // No user, no rooms
            
            query = {
                $or: [
                    { owner: user._id },
                    { 'collaborators.user': user._id }
                ]
            };
        }

        const rooms = await Room.find(query)
            .populate('owner collaborators.user')
            .sort({ updatedAt: -1, createdAt: -1 });
        res.json(rooms);
    } catch (err) {
        console.error("Error fetching user rooms:", err);
        res.status(500).json({ message: err.message });
    }
});

// Get Room by roomId
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId }).populate('owner collaborators.user');
        if (!room) return res.status(404).json({ message: "Room not found" });
        
        // Convert to object to safely add property without affecting DB
        const roomObj = room.toObject();
        roomObj.hasPassword = !!room.password;
        
        // Return actual password only to the owner
        if (req.query.userId && room.owner._id.toString() === req.query.userId) {
            // keep roomObj.password
        } else {
            // Remove actual password from response for security
            delete roomObj.password;
        }

        res.json(roomObj);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete Room
router.delete('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOneAndDelete({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });
        res.json({ message: "Room deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add File/Folder
router.post('/:roomId/files', async (req, res) => {
    try {
        const { name, type, parentId, language } = req.body;
        const fileId = uuidv4();
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        room.files.push({
            id: fileId,
            name,
            type,
            parentId: parentId || null,
            content: type === 'file' ? "" : undefined,
            language: language || 'javascript'
        });

        await room.save();
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete File/Folder
router.delete('/:roomId/files/:fileId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        // Recursive delete helper for folders
        const deleteRecursively = (id) => {
            const children = room.files.filter(f => f.parentId === id);
            children.forEach(child => deleteRecursively(child.id));
            room.files = room.files.filter(f => f.id !== id);
        };

        deleteRecursively(req.params.fileId);

        // If active file was deleted, set it to something else
        if (room.activeFileId === req.params.fileId) {
            const firstFile = room.files.find(f => f.type === 'file');
            room.activeFileId = firstFile ? firstFile.id : null;
        }

        await room.save();
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Collaborator Role
router.put('/:roomId/collab-role', async (req, res) => {
    const { userId, role } = req.body;
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        const collabIndex = room.collaborators.findIndex(c => c.user.toString() === userId);
        if (collabIndex !== -1) {
            room.collaborators[collabIndex].role = role;
            await room.save();
            const updatedRoom = await Room.findOne({ roomId: req.params.roomId }).populate('owner collaborators.user');
            return res.json({ message: "Role updated successfully", room: updatedRoom });
        }
        res.status(404).json({ message: "Collaborator not found" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add Collaborator (Invite)
router.post('/:roomId/collaborators', async (req, res) => {
    try {
        const { email, role } = req.body;
        const userToInvite = await User.findOne({ email });
        if (!userToInvite) return res.status(404).json({ message: "User not found with this email" });

        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        const exists = room.collaborators.some(c => c.user.toString() === userToInvite._id.toString());
        if (exists) return res.status(400).json({ message: "User is already a collaborator" });

        room.collaborators.push({ user: userToInvite._id, role: role || 'editor' });
        await room.save();
        
        const updatedRoom = await Room.findOne({ roomId: req.params.roomId }).populate('owner collaborators.user');
        res.json(updatedRoom);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Remove Collaborator
router.delete('/:roomId/collaborators/:userId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (room.owner.toString() === req.params.userId) {
            return res.status(400).json({ message: "Cannot remove the owner" });
        }

        room.collaborators = room.collaborators.filter(c => c.user.toString() !== req.params.userId);
        await room.save();

        const updatedRoom = await Room.findOne({ roomId: req.params.roomId }).populate('owner collaborators.user');
        res.json(updatedRoom);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Room Password
router.put('/:roomId/password', async (req, res) => {
    try {
        const { password, action } = req.body;
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        if (action === 'remove') {
            room.password = null;
        } else if (password) {
            // Save as plaintext so the owner can view it
            room.password = password;
        } else {
            return res.status(400).json({ message: "Password is required" });
        }

        await room.save();
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
