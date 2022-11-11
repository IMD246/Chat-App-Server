const router = require('express').Router();
const userController = require('../controllers/userController');
const multer = require("multer");
const path = require("path");
const User = require('../models/User');

// add new img into "avatars" folder
const Storage = multer.diskStorage({
    destination: 'uploads/avatars',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: Storage });
router.post("/upload", upload.single('avatars'), async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            { _id: req.body.userID },
            {
                $set: {
                    urlImage: "https://appsocketonline2.herokuapp.com/uploads/avatars/" + req.file.filename,
                }
            }
        );
        return res.json({ path: "https://appsocketonline2.herokuapp.com/uploads/avatars/" + req.file.filename });
    } catch (e) {
        return res.json({ error: e });
    }
});
// Change mode state in app
router.post("/changeDarkMode", userController.changeDarkMode);

module.exports = router;