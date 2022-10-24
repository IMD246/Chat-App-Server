const mongoose = require('mongoose');

const SourceChatsSchema = new mongoose.Schema({
    idRoom: {
        type: String,
        required: true,
        unique: true,
    },
    sourceChat: {
        type: Object,
        required: true,
    },
}, { timestamps: true }
);

module.exports = mongoose.model("sourcechats", SourceChatsSchema);