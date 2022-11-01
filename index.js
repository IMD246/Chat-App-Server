const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const dotenv = require("dotenv");
const port = process.env.PORT;
// const port = 5000;
const mongoose = require("mongoose");
const authRouter = require("./routes/auth");
const chatRouter = require("./routes/chat");
const userRouter = require("./routes/user");
const UserJoinApp = require("./models/UserJoinApp");
const { Server } = require("socket.io");
const multer = require("multer");
const Presence = require("./models/Presence");
const SourceChat = require("./models/SourceChat");
const Room = require("./models/Room");
const User = require("./models/User");
const Friend = require("./models/Friend");
const path = require("path");

dotenv.config();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
}).then(console.log("connected to MongGoDB")).catch((error) => console.log(error));

const Storage = multer.diskStorage({
        destination: 'uploads/avatars',
        filename: (req, file, cb) => {
                cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
        }
});
const upload = multer({ storage: Storage });

// SocketIO
const io = new Server(server);

var listOnlineUser = [];
io.on("connection", (socket) => {
        // Join app
        socket.on("joinApp", async (userID) => {
                console.log("join app " + socket.id);
                listOnlineUser.push(new UserJoinApp(socket, userID));
        });

        // Get source chat by roomID
        socket.on("joinRoom", async (data) => {
                socket.join(data.roomID); // create socket room
                const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                const room = await Room.findOne({ _id: data.roomID });

                if (room.lastMessage.idSender != data.userID) {
                        let lastTime = Object.keys(sourceChat.sourceChat).at(-1);
                        let updateSourceChat = sourceChat.sourceChat;
                        updateSourceChat[lastTime].at(-1).at(-1).state = "viewed";
                        await SourceChat.findOneAndUpdate(
                                { idRoom: data.roomID },
                                {
                                        $set: {
                                                sourceChat: updateSourceChat
                                        }
                                }
                        );

                        room.state = 0;
                        await room.save();
                        socket.emit("getRooms", { room: room });
                }
                io.to(data.roomID).emit("getSourceChat", sourceChat);
        });

        socket.on("dev", data => {
                console.log("type: " + typeof data)
        });

        // Recevie a message
        socket.on("message", async (msg) => {
                msg.message.state = "sended"; // change msg state from loading to sended

                // update last message for room
                let room;
                let friend;
                let presence;
                if (!msg.idRoom) { // room does not exist 
                        room = new Room({
                                users: [msg.idUser, msg.idTarget],
                                lastMessage: msg.message,
                                state: 1
                        });
                        await room.save();
                        friend = await User.findOne({ _id: msg.idTarget });
                        presence = await Presence.findOne({ userID: msg.idTarget });
                        socket.join(room.id); // create socket room
                } else {
                        room = await Room.findOne({ _id: msg.idRoom });
                        let oldState = room.state;
                        await Room.findOneAndUpdate(
                                { _id: msg.idRoom },
                                {
                                        $set: {
                                                lastMessage: msg.message,
                                                state: oldState + 1
                                        }
                                }
                        );
                        room = await Room.findOne({ _id: msg.idRoom });
                }
                // Send room data for clients
                socket.emit("getRooms", {
                        room: room,
                        user: friend ?? null,
                        presence: presence ?? null
                });
                let mess = listOnlineUser.findIndex((user) => user.userID === msg.idTarget);
                if (mess != -1) {
                        friend = await User.findOne({ _id: msg.idUser });
                        presence = await Presence.findOne({ userID: msg.idUser });
                        listOnlineUser[mess].socket.emit("getRooms", {
                                room: room,
                                user: friend ?? null,
                                presence: presence ?? null
                        });
                }

                // update source chat
                let sourceChatDoc = await SourceChat.findOne({ idRoom: room.id });
                if (!sourceChatDoc) {
                        const initChat = [msg.message];
                        let objectTime = {};
                        objectTime[msg.message.time] = [initChat];
                        await new SourceChat({
                                idRoom: room.id,
                                sourceChat: objectTime
                        }).save();
                        sourceChatDoc = await SourceChat.findOne({ idRoom: room.id });
                } else {
                        let sourceChat = sourceChatDoc.sourceChat;
                        let lastTime = Object.keys(sourceChat).at(-1);
                        let newTime = msg.message.time;
                        if (lastTime.split(" ")[1] < newTime.split(" ")[1]) {
                                sourceChat[msg.message.time] = [[msg.message]];
                        } else {
                                let lastClusterMsg = sourceChat[lastTime].at(-1);
                                lastClusterMsg[0].idSender === msg.idUser
                                        ? sourceChat[lastTime].at(-1).push(msg.message)
                                        : sourceChat[lastTime].push([msg.message]);
                        }
                        await SourceChat.updateOne(
                                { idRoom: room.id },
                                {
                                        $set: {
                                                sourceChat: sourceChat
                                        }
                                }
                        );
                }

                io.to(room.id).emit("getSourceChat", sourceChatDoc);
        });

        // Add a new friend request
        socket.on("addFriendRequest", async (data) => {
                // find socket
                let index = listOnlineUser.findIndex(
                        (user) => user.userID === data.friendID
                );
                if (!index) {
                        // send request
                        let user = await User.findOne({ _id: data.userID });
                        let objectRequest = {
                                user: user,
                                time: data.time
                        };
                        console.log(
                                `add request: index = ${index}, socket = ${listOnlineUser[index].socket.id}`
                        );
                        listOnlineUser[index].socket.emit("friendRequest", objectRequest);
                }

                // Update list friend requests
                let friendRequests = await Friend.findOne({ userID: data.friendID });
                if (!friendRequests) {
                        // initialized
                        const newFriend = new Friend({
                                userID: data.friendID,
                                requests: [
                                        {
                                                userID: data.userID,
                                                time: data.time
                                        }
                                ]
                        });
                        await newFriend.save();
                } else {
                        // update
                        friendRequests.requests.push({
                                userID: data.userID,
                                time: data.time
                        });
                        await friendRequests.save();
                }
                socket.emit("addFriendRequestSuccess", true);
        });

        // Accept a friend request
        socket.on("acceptFriendRequest", async (data) => {
                // get the friend tables
                let acceptFriendTable = await Friend.findOne({ userID: data.userID }); // chac chan khac null
                let requestFriendTable = await Friend.findOne({ userID: data.friendID });
                if (!requestFriendTable) {
                        await new Friend({
                                userID: data.friendID
                        }).save();
                        requestFriendTable = await Friend.findOne({ userID: data.friendID });
                }
                // add to friend
                acceptFriendTable.friends.push(data.friendID);
                requestFriendTable.friends.push(data.userID);
                // remove the request
                let index = acceptFriendTable.requests.findIndex(
                        (req) => req["userID"] === data.friendID
                );
                acceptFriendTable.requests.splice(index, 1);
                await acceptFriendTable.save();
                await requestFriendTable.save();
                // update clients data
                let num = listOnlineUser.findIndex((user) => user.userID === data.friendID);
                if (!num) {
                        let arrUserInfoR = [];
                        for (const item of requestFriendTable.friends) {
                                const userInfo = await User.findOne({ _id: item });
                                arrUserInfoR.push(userInfo);
                        }
                        listOnlineUser[num].socket.emit("updateFriends", arrUserInfoR);
                }
                let arrUserInfoA = [];
                for (const item of acceptFriendTable.friends) {
                        const userInfo = await User.findOne({ _id: item });
                        arrUserInfoA.push(userInfo);
                }
                socket.emit("updateFriends", arrUserInfoA);
        });

        // A user was offline
        socket.on("disconnect", async (data) => {
                const index = listOnlineUser.findIndex(
                        (user) => user.socket.id === socket.id
                );
                const id = listOnlineUser[index].userID;
                await Presence.findOneAndUpdate(
                        { userID: id },
                        {
                                $set: {
                                        presence: false
                                }
                        }
                );
                console.log("disconnect " + socket.id);
                listOnlineUser.splice(index, 1);
                io.emit("updatePresence", "updatePresence");
        });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/user", userRouter);
app.use('/uploads', express.static('uploads'));

app.post("/upload", upload.single('avatar'), (req, res) => {
        try {
                if (req.file) {
                        return res.json({ path: "/uploads/avatars/" + req.file.filename });
                }
        } catch (e) {
                return res.json({ error: e });
        }
});
app.get("/", (req, res) => {
        res.send("Its working !");
});
server.listen(port, () => {
        console.log(`listening on: *${port}`);
});
