const mongoose = require('mongoose');

const AccessTokenSchema = new mongoose.Schema({
        accessToken: {
                type: String,
                required: true,
        },
        userID: {
                type: String,
                required: true,
        }
}, { timestamps: true }
);

module.exports = mongoose.model("AccessToken", AccessTokenSchema);