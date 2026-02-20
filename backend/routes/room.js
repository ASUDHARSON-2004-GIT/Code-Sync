const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

// Create Room
router.post('/create', async (req, res) => {
    try {
        const { name, userId } = req.body;
        const roomId = uuidv4().substring(0, 8);
        const defaultFileId = uuidv4();
        const newRoom = new Room({
            roomId,
            name,
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
    const { roomId, userId } = req.body;
    try {
        const room = await Room.findOne({ roomId });
        if (!room) return res.status(404).json({ message: "Room not found" });

        const isOwner = room.owner.toString() === userId;
        const isCollaborator = room.collaborators.some(c => c.user.toString() === userId);

        if (!isOwner && !isCollaborator) {
            room.collaborators.push({ user: userId, role: 'editor' });
            await room.save();
        }
        res.json(room);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get User's Rooms (must be before /:roomId to avoid route conflict)
router.get('/user/:userId', async (req, res) => {
    try {
        const rooms = await Room.find({
            $or: [
                { owner: req.params.userId },
                { 'collaborators.user': req.params.userId }
            ]
        }).sort({ updatedAt: -1, createdAt: -1 });
        res.json(rooms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get Room by roomId
router.get('/:roomId', async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId }).populate('owner collaborators.user');
        if (!room) return res.status(404).json({ message: "Room not found" });
        res.json(room);
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

module.exports = router;
