const User = require('../models/User');
const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const Room = require('../models/Room');
const Presence = require('../models/Presence');
const Friends = require('../models/Friend');

// get friend requests
exports.getFriendRequests = async (req, res) => {
    try {
        const friends = await Friends.findOne({ userID: req.body.userID });
        let friendRequests = [];
        if (!friends) {
            return res.status(400).json(new BaseResponse(
                -1,
                Date.now(),
                [],
                new Errors(
                    400,
                    "Not found",
                ))
            );
        }
        for (const element of friends.requests) {
            let request = {};
            let user = await User.findOne({ _id: element['userID']});
            request['user'] = user;
            request['time'] = element['time'];
            friendRequests.push(request);
        }
        return res.status(200).json(new BaseResponse(
            1,
            Date.now(),
            friendRequests,
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
// get friend requests
exports.createFriend = async (req, res) => {
    try {
        const friends = new Friends({
            userID: req.body.userID,
        });
        await friends.save();

        return res.status(200).json(new BaseResponse(
            1,
            Date.now(),
            [],
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

// send rooms data to user
exports.getRooms = async (req, res) => {
    try {
        let chatRooms = [];
        const rooms = await Room.find({ users: { $in: [req.body.userID] } });

        for (const element of rooms) {
            let objectRoom = {};

            // room info
            objectRoom['room'] = element;

            // user info
            let listUserID = element.users;
            let friendID = req.body.userID === listUserID[0] ? listUserID[1] : listUserID[0];
            const user = await User.findOne({ _id: friendID });
            objectRoom['user'] = user;

            //presence
            const presence = await Presence.findOne({ userID: friendID });
            objectRoom['presence'] = presence;

            chatRooms.push(objectRoom);
        }

        return res.status(200).json(new BaseResponse(
            1,
            Date.now(),
            chatRooms,
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

exports.createRoom = async (req, res) => {
    try {
        const newChatRom = new Room({
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

exports.findAUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json(new BaseResponse(
                -1,
                Date.now(),
                user,
                new Errors(400, "Not found")
            ));
        }
        return res.status(200).json(new BaseResponse(
            1,
            Date.now(),
            user,
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