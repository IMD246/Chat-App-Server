const User = require('../models/User');
const BaseResponse = require('../models/BaseResponse');
const Errors = require('../models/Errors');
const Chat = require('../models/Chat');
const Presence = require('../models/Presence');

// send rooms data to user
exports.joinApp = async (req, res) => {// "userID": "...."
    try {
        let chatRooms = [];
        const rooms = await Chat.find({ users: { $in: [req.body.userID] } });

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