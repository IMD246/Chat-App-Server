const router = require('express').Router();
const userController = require('../controllers/userController');

// Change mode state in app
router.post("/changeDarkMode", userController.changeDarkMode);

module.exports = router;