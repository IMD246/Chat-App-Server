const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
        users: {
                type: Array,
                required: true,
        },
        lastMessage: {
                type: String,
                required: true,
        },
        typeLastMessage:{
                type: String,
                default: 'text',  
        },
        timeLastMessage:{
                type: String,
                required: true, 
        }
        // active: {
        //         type: Boolean,
        //         default: false, 
        // }
}, { timestamps: true }
);

module.exports = mongoose.model("rooms", ChatSchema);