const mongoose = require("mongoose");

const FriendsSchema = new mongoose.Schema({
    userID: {
        type: String,
        required: true,
        unique: true,
    },
    friends: {
        type: Array,
        default: [],
    },
    request: {
        type: Array,
        default: [],
    },
    ban: {
        type: Array,
        default: [],
    },
}, { timeStamp: true }
);
module.exports = mongoose.model("friends", FriendsSchema);