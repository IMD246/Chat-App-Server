const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
        users: {
                type: Array,
                required: true,
        },
        lastMessage: {
                type: Object,
                required: true,
        },
        state: {
                type: Number,
                required: true,
        }
}, { timestamps: true }
);

module.exports = mongoose.model("rooms", RoomSchema);