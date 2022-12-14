const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const dotenv = require("dotenv");
// const port = process.env.PORT;
const port = 5000;
const mongoose = require("mongoose");
const authRouter = require("./routes/auth");
const chatRouter = require("./routes/chat");
const userRouter = require("./routes/user");
const UserJoinApp = require("./models/UserJoinApp");
const { Server } = require("socket.io");
const Presence = require("./models/Presence");
const SourceChat = require("./models/SourceChat");
const Room = require("./models/Room");
const User = require("./models/User");
const Friend = require("./models/Friend");
const firebase = require("firebase-admin");
const serviceAccount = require("./secrets/chitchat-2201f-firebase-adminsdk-pbl8v-888b056fb8.json");
const AccessToken = require("./models/AccessToken");

firebase.initializeApp({
        credential: firebase.credential.cert(serviceAccount)
});

dotenv.config();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
}).then(console.log("connected to MongGoDB")).catch((error) => console.log(error));

// SocketIO
const io = new Server(server);

var listOnlineUser = [];
io.on("connection", (socket) => {
        // Join app
        socket.on("joinApp", async userID => {
                // send request update presence to friends 
                socket.to(userID).emit('updatePresence',
                        {
                                "userID": userID,
                                "presence": true,
                        },
                );
                console.log("join app " + socket.id);
                // join room to get request update presence
                let friendCollection = await Friend.findOne({ userID: userID });
                if (friendCollection != null) {
                        friendCollection.friends.forEach(friendID => {
                                socket.join(friendID); // room to process presence
                        });
                }

                listOnlineUser.push(new UserJoinApp(socket, userID));
        });

        // Get source chat by roomID
        socket.on("joinRoom", async (data) => {
                socket.join(data.roomID); // create socket room
                // get source chat and room
                const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                socket.emit("getSourceChat", sourceChat);
        });

        // Change state room
        socket.on("viewMessage", async data => {
                const room = await Room.findOne({ _id: data.roomID });
                // Change state of last msg to "viewed" and state to notify is zero
                if (room.lastMessage.idSender != data.userID) {
                        const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                        // change to "viewed"
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
                        // change state to zero
                        room.state = 0;
                        await room.save();
                        socket.emit("getRooms", { room: room });
                        socket.to(data.roomID).emit("getSourceChat", sourceChat);
                }
        });

        // Exit chat room
        socket.on("exitRoom", data => {
                socket.leave(data);
        });

        // Recevie a message
        socket.on("message", async (msg) => {
                msg.message.state = "sended"; // change msg state from loading to sended
                // find a user is friend of userID (if existed)
                let mess = listOnlineUser.findIndex((user) => user.userID === msg.idTarget);

                // Get room
                let room;
                if (msg.idRoom === '') { // room does not exist 
                        room = new Room({
                                users: [msg.idUser, msg.idTarget],
                                lastMessage: msg.message,
                                state: 1
                        });
                        await room.save();
                        socket.join(room.id); // create socket room
                } else {
                        room = await Room.findOne({ _id: msg.idRoom });
                        // change room state
                        let idSender = room.lastMessage.idSender;
                        room.state = idSender === msg.idUser ? room.state + 1 : 1;
                }

                // update source chat
                let sourceChatDoc = await SourceChat.findOne({ idRoom: room.id });
                if (!sourceChatDoc) { // init new source chat
                        const initClusterMsg = [msg.message];
                        let newObjectTime = {};
                        newObjectTime[msg.message.time] = [initClusterMsg];
                        await new SourceChat({
                                idRoom: room.id,
                                sourceChat: newObjectTime
                        }).save();
                        sourceChatDoc = await SourceChat.findOne({ idRoom: room.id });
                } else {
                        let sourceChat = sourceChatDoc.sourceChat; // it contains time objects
                        let lastTime = Object.keys(sourceChat).at(-1);
                        if (msg.isCurrentTime) {
                                // compare senderID of last message with cunrrentID
                                sourceChat[lastTime].at(-1)[0].idSender === msg.idUser
                                        ? sourceChat[lastTime].at(-1).push(msg.message)
                                        : sourceChat[lastTime].push([msg.message]);
                        } else {
                                sourceChat[msg.message.time] = [[msg.message]];
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

                // update last message of room
                if (msg.subMsg != '') msg.message.content = msg.subMsg;
                await Room.findOneAndUpdate(
                        { _id: room.id },
                        {
                                $set: {
                                        lastMessage: msg.message,
                                        state: room.state
                                }
                        }
                );
                // room.lastMessage = msg.message;
                room = await Room.findOne({ _id: room.id }); // get time update and new lastMsg
                // Send room data for clients
                if (msg.idRoom == '') {
                        let friend = await User.findOne({ _id: msg.idTarget });
                        let presence = await Presence.findOne({ userID: msg.idTarget });
                        socket.emit("getRooms", {
                                room: room,
                                user: friend,
                                presence: presence
                        });
                        if (mess != -1) {
                                friend = await User.findOne({ _id: msg.idUser });
                                presence = await Presence.findOne({ userID: msg.idUser });
                                listOnlineUser[mess].socket.emit("getRooms", {
                                        room: room,
                                        user: friend,
                                        presence: presence
                                });
                        }

                } else {
                        socket.emit("getRooms", { room: room });
                        if (mess != -1) {
                                listOnlineUser[mess].socket.emit("getRooms", { room: room });
                        }
                }

                // push notification for friend if he don't online
                if (mess != -1) return;

                // get device token to push notification
                let friendToken = await AccessToken.findOne({ userID: msg.idTarget });
                if (!friendToken) return;

                let currentUser = await User.findOne({ _id: msg.idUser });
                await firebase.messaging().sendMulticast({
                        tokens: [friendToken.deviceToken],
                        notification: {
                                title: "ChitChat",
                                body: "New message from " + currentUser.name,
                                imageUrl: currentUser.urlImage.toString(),
                        },
                }).catch(function (error) {
                        console.log("ERROR: ", error);
                });
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
                // send request update presence to friends 
                socket.to(id).emit('updatePresence',
                        {
                                "userID": id,
                                "presence": false,
                        },
                );
                await Presence.findOneAndUpdate(
                        { userID: id },
                        {
                                $set: {
                                        presence: false
                                }
                        }
                );
                listOnlineUser.splice(index, 1);
                console.log("disconnect " + socket.id);
        });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/user", userRouter);
app.use('/uploads', express.static('uploads'));

server.listen(port, () => {
        console.log(`listening on: *${port}`);
});
