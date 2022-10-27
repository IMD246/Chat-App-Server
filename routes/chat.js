const router = require('express').Router();
const chatController = require('../controllers/chatController');

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