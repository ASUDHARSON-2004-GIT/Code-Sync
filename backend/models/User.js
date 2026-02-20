const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    photoURL: { type: String },
    uid: { type: String }, // For Firebase Auth users
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
