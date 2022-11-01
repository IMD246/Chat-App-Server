const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
        email: {
                type: String,
                required: true,
                unique: true,
        },
        name: {
                type: String,
                required: true,
        },
        password: {
                type: String,
                required: true,
        },
        isDarkMode: {
                type: Boolean,
                default: false,
        },
        urlImage: {
                data: Buffer,
                contentType: String,
        }
}, { timeStamp: true }
);
module.exports = mongoose.model("User", UserSchema);