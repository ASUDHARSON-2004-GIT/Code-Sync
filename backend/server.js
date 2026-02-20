const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const Room = require('./models/Room');

dotenv.config();

// Prevent crashes from unhandled errors/rejections
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception (server kept alive):', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection (server kept alive):', reason);
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/room', require('./routes/room'));
app.use('/api/execute', require('./routes/execute'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB Connection Error:", err));

// Initial Room State Store (In-memory for active sessions, persistence in DB)
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', async ({ roomId, user }) => {
        socket.join(roomId);
        console.log(`User ${user.name || 'Anonymous'} joined room: ${roomId}`);

        // Track user in room
        if (!rooms.has(roomId)) {
            let files = [];
            let activeFileId = null;
            try {
                const room = await Room.findOne({ roomId });
                if (room) {
                    files = room.files || [];
                    activeFileId = room.activeFileId;
                }
            } catch (err) {
                console.error("Error fetching room from DB:", err);
            }
            rooms.set(roomId, { users: [], files, activeFileId, messages: [] });
        }

        const roomData = rooms.get(roomId);
        const existingUserIndex = roomData.users.findIndex(u => u.socketId === socket.id);
        if (existingUserIndex === -1) {
            roomData.users.push({ ...user, socketId: socket.id });
        }

        // Broadcast user list to everyone in room
        io.to(roomId).emit('user-list', roomData.users);

        // Send current files to the newcomer
        socket.emit('files-update', roomData.files);
        socket.emit('active-file-update', roomData.activeFileId);
        socket.emit('chat-history', roomData.messages || []);
    });

    socket.on('code-change', async ({ roomId, fileId, code }) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            const file = roomData.files.find(f => f.id === fileId);
            if (file) {
                file.content = code;
                socket.to(roomId).emit('code-update', { fileId, code });

                try {
                    await Room.findOneAndUpdate(
                        { roomId, 'files.id': fileId },
                        { $set: { 'files.$.content': code } }
                    );
                } catch (err) {
                    console.error("Auto-save error:", err);
                }
            }
        }
    });

    socket.on('file-create', ({ roomId, file }) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            roomData.files.push(file);
            socket.to(roomId).emit('file-created', file);
        }
    });

    socket.on('file-delete', ({ roomId, fileId }) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            roomData.files = roomData.files.filter(f => f.id !== fileId);
            socket.to(roomId).emit('file-deleted', fileId);
        }
    });

    socket.on('file-switch', ({ roomId, fileId }) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            roomData.activeFileId = fileId;
            socket.to(roomId).emit('active-file-update', fileId);

            // Persist active file choice
            Room.findOneAndUpdate({ roomId }, { activeFileId: fileId }).catch(e => console.error(e));
        }
    });

    socket.on('language-change', ({ roomId, language }) => {
        if (rooms.has(roomId)) {
            rooms.get(roomId).language = language;
            // Broadcast to everyone else in the room
            socket.to(roomId).emit('language-update', language);
            // Persist to DB so reloads restore the correct language
            Room.findOneAndUpdate({ roomId }, { language }).catch(err =>
                console.error("Language save error:", err)
            );
        }
    });

    socket.on('cursor-move', ({ roomId, cursor, user }) => {
        socket.to(roomId).emit('cursor-update', { id: socket.id, cursor, user });
    });

    socket.on('send-message', ({ roomId, message, user }) => {
        if (rooms.has(roomId)) {
            const roomData = rooms.get(roomId);
            if (!roomData.messages) roomData.messages = [];

            const newMessage = {
                user: {
                    id: user.id || user._id || user.uid,
                    name: user.name,
                    photoURL: user.photoURL
                },
                message,
                timestamp: new Date()
            };

            roomData.messages.push(newMessage);
            // Keep only last 50 messages to prevent memory leak
            if (roomData.messages.length > 50) roomData.messages.shift();

            io.to(roomId).emit('new-message', newMessage);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((data, roomId) => {
            const index = data.users.findIndex(u => u.socketId === socket.id);
            if (index !== -1) {
                data.users.splice(index, 1);
                io.to(roomId).emit('user-list', data.users);
                io.to(roomId).emit('user-left', socket.id);

                // Clean up room from memory if empty
                if (data.users.length === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
