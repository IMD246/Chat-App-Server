const router = require('express').Router();
const User = require('../models/User');
const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const Chat = require('../models/Chat');
//REGISTER
router.post("/createRoom", async (req, res) => {
        try {
                const newChatRom = new Chat({
                        users: req.body.users,
                        lastMessage: req.body.message,
                        typeLastMessage: req.body.type,
                        timeLastMessage: req.body.time,
                });
                await newChatRom.save();
                return res.status(200).json(new BaseResponse(
                        1,
                        Date.now(),
                        [],
                        new Errors(
                                200,
                                "Create chat room Successfully!",
                        )
                ));
        } catch (error) {
                console.log(error.toString());
                return res.status(500).json(new BaseResponse(
                        -1,
                        Date.now(),
                        []
                        ,
                        new Errors(
                                500,
                                error.toString(),
                        )

                ));
        }
});
router.post("/getInfoUserByID", async (req, res) => {
        try {
                const user = await User.findOne({ _id: req.body.userID });
                if (!user) {
                        return res.status(403).json(new BaseResponse(
                                -1,
                                Date.now(),
                                [],
                                new Errors(
                                        403,
                                        "Not found user!",
                                )
                        ));
                }
                return res.status(200).json(new BaseResponse(
                        1,
                        Date.now(),
                        [
                                user
                        ],
                        new Errors(
                                200,
                                "Successfully!",
                        )
                ));
        } catch (error) {
                console.log(error.toString());
                return res.status(500).json(new BaseResponse(
                        -1,
                        Date.now(),
                        []
                        ,
                        new Errors(
                                500,
                                error.toString(),
                        )

                ));
        }
});

module.exports = router ;