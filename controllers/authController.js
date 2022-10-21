const User = require('../models/User');
const AccessToken = require('../models/AccessToken');
const Presence = require('../models/Presence');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const Chat = require('../models/Chat');


exports.logout = async (req, res) => {
        try {
                const user = await User.findById(req.body.userID);
                if (!user) {
                        return res.status(400).json(
                                new BaseResponse(
                                        -1,
                                        Date.now(),
                                        [],
                                        new Errors(
                                                404,
                                                "Cant found This User",
                                        )
                                ));
                }
                await AccessToken.deleteOne({
                        userID: user.id
                });
                await Presence.updateOne({ userID: user.id }, {
                        $set: {
                                presence: false,
                        }
                });
                return res.status(200).json(
                        new BaseResponse(
                                1,
                                Date.now(),
                                [

                                ],
                                new Errors(
                                        200,
                                        "Logout Successfully",
                                )
                        ));

        } catch (err) {
                return res.status(500).json(new BaseResponse(
                        -1,
                        Date.now(),
                        [],
                        new Errors(
                                500,
                                err.toString(),
                        )
                ));
        }
}

exports.loginByToken = async (req, res) => {
        try {
                const authorization = req.headers.authorization;
                const str = authorization.split(" ")[1];
                const checkAccessToken = await AccessToken.findOne({ accessToken: str });
                if (checkAccessToken != null) {
                        const user = await User.findById(checkAccessToken.userID);
                        const updatePresence = await Presence.findOneAndUpdate({ userID: user.id }, {
                                $set: {
                                        presence: true,
                                }
                        });
                        const userPresence = await Presence.findById(updatePresence);
                        if (user != null) {
                                return res.status(200).json(
                                        new BaseResponse(
                                                1,
                                                Date.now(),
                                                [
                                                        { accessToken: checkAccessToken, user: user, userPresence: userPresence }
                                                ],
                                                new Errors(
                                                        200,
                                                        "",
                                                )
                                        ));
                        }
                        else {
                                return res.status(401).json(
                                        new BaseResponse(
                                                -1,
                                                Date.now(),
                                                [],
                                                new Errors(
                                                        401,
                                                        "You are not authenticated",
                                                )
                                        ));
                        }
                }
                else {
                        res.status(404).json(
                                new BaseResponse(
                                        -1,
                                        Date.now(),
                                        [],
                                        new Errors(
                                                401,
                                                "Token is invalid",
                                        )
                                ));
                }

        } catch (err) {
                return res.status(500).json(
                        new BaseResponse(
                                -1,
                                Date.now(),
                                [],
                                new Errors(
                                        500,
                                        err.toString(),
                                )
                        ));
        }
}

exports.register = async (req, res) => {
        try {
                const checkEmail = await User.findOne({ email: req.body.email });
                if (checkEmail) {
                        return res.status(403).json(new BaseResponse(
                                -1,
                                Date.now(),
                                [],
                                new Errors(
                                        403,
                                        "Email is already in use",
                                )
                        ));
                }
                const salt = await bcrypt.genSalt(10);
                const hashPass = await bcrypt.hash(req.body.password, salt);
                const newUser = new User({
                        email: req.body.email,
                        name: req.body.name,
                        password: hashPass,
                        isDarkMode: false,
                        urlImage: ""
                });
                const user = await newUser.save();
                const newPresence = new Presence({
                        userID: user.id,
                        presence: false
                });
                await newPresence.save();
                return res.status(200).json(new BaseResponse(
                        1,
                        Date.now(),
                        [],
                        new Errors(
                                200,
                                "Register Successfully!",
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
}

exports.login = async (req, res) => {
        try {
                const user = await User.findOne({ email: req.body.email });
                if (!user) {
                        return res.status(400).json(
                                new BaseResponse(
                                        -1,
                                        Date.now(),
                                        [],
                                        new Errors(
                                                400,
                                                "Wrong credentials",
                                        )
                                ));
                }
                const validate = await bcrypt.compare(req.body.password, user.password);
                if (!validate) {
                        return res.status(400).json(new BaseResponse(
                                -1,
                                Date.now(),
                                [],
                                new Errors(
                                        400,
                                        "Wrong credentials",
                                ))
                        );
                }

                // Generate an access token
                var accessToken = jwt.sign({ id: user.id }, "mySecrectKey");

                var checkAccess = await AccessToken.findOne({
                        userID: user.id
                })
                if (checkAccess != null) {
                        accessToken = checkAccess.accessToken;
                }
                else {
                        const access = new AccessToken({
                                accessToken: accessToken,
                                userID: user.id
                        }
                        );
                        await access.save();
                        checkAccess = access;
                }
                const updatePresence = await Presence.findOneAndUpdate({ userID: user.id }, {
                        $set: {
                                presence: true,
                        }
                });
                const userPresence = await Presence.findById(updatePresence);
                return res.status(200).json(
                        new BaseResponse(
                                1,
                                Date.now(),
                                [
                                        { accessToken: checkAccess, user: user, userPresence: userPresence }
                                ],
                                new Errors(
                                        200,
                                        "",
                                )
                        ));

        } catch (err) {
                return res.status(500).json(new BaseResponse(
                        -1,
                        Date.now(),
                        [],
                        new Errors(
                                500,
                                err.toString(),
                        )
                ));
        }
}

exports.createRoom = async (req, res) => {
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
}

exports.getPresence = async (req, res) => {
        try {
                const presence = await Presence.findOne({ userID: req.body.userID });
                if (!presence) {
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
                                presence
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
}