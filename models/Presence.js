const mongoose = require("mongoose");

const PresenceSchema = new mongoose.Schema({
        userID: {
                type: String,
                required: true,
                unique: true,
        },
        presence:{
                type:Boolean,
                required:true,
                default:false,
        }
}, { timeStamp: true }
);
module.exports = mongoose.model("Presence", PresenceSchema);