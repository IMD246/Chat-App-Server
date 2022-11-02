const router = require('express').Router();
const chatController = require('../controllers/chatController');
const multer = require("multer");
const path = require("path");

// add new img into "chats" folder
const Storage = multer.diskStorage({
    destination: 'uploads/chats',
    filename: (req, file, cb) => {
            cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: Storage });
router.post("/upload", upload.single('img'), (req, res) => {
    try {
            if (req.file) {
                    return res.json({ path: "/uploads/chats/" + req.file.filename });
            }
    } catch (e) {
            return res.json({ error: e });
    }
});
// remove request from friend reuests
router.post("/removeRequest", chatController.removeRequest);
// get friend requests
router.post("/getFriendRequests", chatController.getFriendRequests);
// send rooms data to user
router.post("/getRooms", chatController.getRooms);
// create a new chat room
router.post("/createRoom", chatController.createRoom);
// find a user by email
router.post("/findAUser", chatController.findAUser);

module.exports = router;