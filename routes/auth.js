const router = require('express').Router();

const authController = require('../controllers/authController');

router.post("/presence", authController.getPresence);

router.post("/createRoom",authController.createRoom);
//REGISTER
router.post("/register",authController.register);
//LOGIN
router.post("/login",authController.login);
//Login With Token
router.post("/loginwithaccesstoken", authController.loginByToken);
//Logout
router.post("/logout", authController.logout);

module.exports = router;