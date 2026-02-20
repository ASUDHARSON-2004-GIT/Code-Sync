const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    collaborators: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' }
    }],
    currentCode: { type: String, default: "// Start coding here..." },
    language: { type: String, default: "javascript" },
    files: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ['file', 'folder'], required: true },
        content: { type: String, default: "" },
        language: { type: String, default: "javascript" },
        parentId: { type: String, default: null }
    }],
    activeFileId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);
