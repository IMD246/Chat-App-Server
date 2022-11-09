const User = require('../models/User');
const AccessToken = require('../models/AccessToken');
const Presence = require('../models/Presence');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const Room = require('../models/Room');
const Friend = require('../models/Friend');

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
                if (!checkAccessToken) {
                        return res.status(404).json(
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

                const user = await User.findById(checkAccessToken.userID);
                if (!user) {
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

                const updatePresence = await Presence.findOneAndUpdate({ userID: user.id }, {
                        $set: {
                                presence: true,
                        }
                });
                const userPresence = await Presence.findById(updatePresence);

                // Get necessary all data for client: 
                // 1. Rooms
                let chatRooms = [];
                const rooms = await Room.find({ users: { $in: [user.id] } });

                for (const element of rooms) {
                        let objectRoom = {};

                        // room information
                        objectRoom['room'] = element;

                        // friend information
                        let listID = element.users;
                        let roomfriendID = user.id === listID[0] ? listID[1] : listID[0];
                        const roomFriend = await User.findOne({ _id: roomfriendID });
                        objectRoom['user'] = roomFriend;

                        // presence
                        const presence = await Presence.findOne({ userID: roomfriendID });
                        objectRoom['presence'] = presence;

                        chatRooms.push(objectRoom);
                }

                // 2. Friend requests & list friend
                const friend = await Friend.findOne({ userID: user.id });
                let friendRequests = [];
                let listFriend = [];

                if (friend) {
                        for (const element of friend.requests) {
                                let request = {};
                                request['user'] = await User.findOne({ _id: element['userID'] });
                                request['time'] = element['time'];
                                friendRequests.push(request);
                        }

                        for (const element of friend.friends) {
                                let objectFriend = {};
                                objectFriend['friend'] = await User.findOne({ _id: element });
                                objectFriend['presence'] = await Presence.findOne({ userID: element});
                                listFriend.push(objectFriend);
                        }
                }

                return res.status(200).json(
                        new BaseResponse(
                                1,
                                Date.now(),
                                [
                                        {
                                                accessToken: checkAccessToken,
                                                user: user,
                                                userPresence: userPresence,
                                                chatRooms: chatRooms,
                                                friendRequests: friendRequests,
                                                listFriend: listFriend,
                                        }
                                ],
                                new Errors(
                                        200,
                                        "",
                                )
                        ));

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
                        urlImage: "",
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
                // Check email
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

                // Check password
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

                var checkAccessToken = await AccessToken.findOne({
                        userID: user.id
                })

                if (checkAccessToken != null) {
                        accessToken = checkAccessToken.accessToken;
                } else {
                        const access = new AccessToken({
                                accessToken: accessToken,
                                deviceToken: req.body.deviceToken,
                                userID: user.id
                        }
                        );
                        await access.save();
                        checkAccessToken = access;
                }

                // Update presence of the user
                const updatePresence = await Presence.findOneAndUpdate({ userID: user.id }, {
                        $set: {
                                presence: true,
                        }
                });
                const userPresence = await Presence.findById(updatePresence);

                // Get necessary all data for client: 
                // 1. Rooms
                let chatRooms = [];
                const rooms = await Room.find({ users: { $in: [user.id] } });

                for (const element of rooms) {
                        let objectRoom = {};

                        // room information
                        objectRoom['room'] = element;

                        // friend information
                        let listID = element.users;
                        let roomfriendID = user.id === listID[0] ? listID[1] : listID[0];
                        const roomFriend = await User.findOne({ _id: roomfriendID });
                        objectRoom['user'] = roomFriend;

                        // presence
                        const presence = await Presence.findOne({ userID: roomfriendID });
                        objectRoom['presence'] = presence;

                        chatRooms.push(objectRoom);
                }

                // 2. Friend requests & list friend
                const friend = await Friend.findOne({ userID: user.id });
                let friendRequests = [];
                let listFriend = [];

                if (friend) {
                        for (const element of friend.requests) {
                                let request = {};
                                request['user'] = await User.findOne({ _id: element['userID'] });
                                request['time'] = element['time'];
                                friendRequests.push(request);
                        }

                        for (const element of friend.friends) {
                                let objectFriend = {};
                                objectFriend['friend'] = await User.findOne({ _id: element });
                                objectFriend['presence'] = await Presence.findOne({ userID: element});
                                listFriend.push(objectFriend);
                        }
                }

                return res.status(200).json(
                        new BaseResponse(
                                1,
                                Date.now(),
                                [
                                        {
                                                accessToken: checkAccessToken,
                                                user: user,
                                                userPresence: userPresence,
                                                chatRooms: chatRooms,
                                                friendRequests: friendRequests,
                                                listFriend: listFriend,
                                        }
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