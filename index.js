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
dotenv.config();

const { Server } = require("socket.io");
const Presence = require("./models/Presence");
const SourceChat = require("./models/SourceChat");
const Room = require("./models/Room");
const User = require("./models/User");
const Friend = require("./models/Friend");
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
                console.log("join app " + socket.id);
                listOnlineUser.push(new UserJoinApp(socket, userID));
        });
        // Get source chat by roomID
        socket.on('getSourceChat', async data => {
                const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                socket.emit('getSourceChat', sourceChat ?? null);
        });
        // Recevie a message      
        socket.on("message", async (msg) => {
                msg.message.state = 'sended';
                // update last message for room
                await Room.findOneAndUpdate(
                        { _id: msg.idRoom },
                        {
                                $set: {
                                        lastMessage: msg.message.content,
                                        typeLastMessage: msg.message.type,
                                        timeLastMessage: msg.message.time,
                                },
                        },
                );
                const room = await Room.findOne({ _id: msg.idRoom });
                socket.emit("getRooms", room);
                
                // update source chat
                let sourceChatDoc = await SourceChat.findOne({ idRoom: msg.idRoom });
                if (!sourceChatDoc) {
                        const initChat = [msg.message];
                        let objectTime = {};
                        objectTime[msg.message.time] = [initChat];
                        await new SourceChat({
                                idRoom: msg.idRoom,
                                sourceChat: objectTime,
                        }).save();
                        sourceChatDoc = await SourceChat.findOne({ idRoom: msg.idRoom });
                } else {
                        let sourceChat = sourceChatDoc.sourceChat;
                        let lastTime = Object.keys(sourceChat).at(-1).split(" ")[1];
                        let newTime = msg.message.time.split(" ")[1];
                        if (lastTime < newTime) {
                                sourceChat[msg.message.time] = [[msg.message]];
                        } else {
                                let lastUser = sourceChat[Object.keys(sourceChat).at(-1)].at(-1);
                                const idSenderOfLastMsg = lastUser[0].idSender;
                                idSenderOfLastMsg === msg.idUser
                                        ? sourceChat[Object.keys(sourceChat).at(-1)].at(-1).push(msg.message)
                                        : sourceChat[Object.keys(sourceChat).at(-1)].push([msg.message]);
                        }

                        await SourceChat.updateOne({ idRoom: msg.idRoom }, {
                                $set: {
                                        sourceChat: sourceChat,
                                }
                        });
                }

                let mess = listOnlineUser.findIndex(user => user.userID === msg.idTarget);
                if (mess != -1) {
                        listOnlineUser[mess].socket.emit("getSourceChat", sourceChatDoc);
                }
                socket.emit("getSourceChat", sourceChatDoc);
        });
        // Add a new friend request
        socket.on("addFriendRequest", async (data) => {
                // find socket
                let index = listOnlineUser.findIndex(user => user.userID === data.friendID);
                if (!index) {
                        // send request
                        let user = await User.findOne({ _id: data.userID });
                        let objectRequest = {
                                "user": user,
                                "time": data.time,
                        };
                        console.log(`add request: index = ${index}, socket = ${listOnlineUser[index].socket.id}`);
                        listOnlineUser[index].socket.emit("friendRequest", objectRequest);
                }

                // Update list friend requests
                let friendRequests = await Friend.findOne({ userID: data.friendID });
                if (!friendRequests) {
                        // initialized
                        const newFriend = new Friend({
                                userID: data.friendID,
                                requests: [{
                                        "userID": data.userID,
                                        "time": data.time,
                                }]
                        });
                        await newFriend.save();
                } else {
                        // update
                        friendRequests.requests.push({
                                "userID": data.userID,
                                "time": data.time,
                        });
                        await friendRequests.save();
                }
                socket.emit('addFriendRequestSuccess', true);
        });
        // Accept a friend request
        socket.on("acceptFriendRequest", async data => {
                // find friend socket
                let num = listOnlineUser.findIndex(user => user.userID === data.friendID);
                if(!num){
                        //TODO: Làm chưa tới
                        listOnlineUser[num].socket.emit("updateFriends", null);
                }

                // get the friend tables
                let acceptFriendTable = await Friend.findOne({ userID: data.userID }); // chac chan khac null
                let requestFriendTable = await Friend.findOne({ userID: data.friendID });
                if(!requestFriendTable){
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
                        req => req['userID'] === data.friendID
                );
                acceptFriendTable.requests.splice(index, 1);
                await acceptFriendTable.save();
                await requestFriendTable.save();
        });
        // A user was offline 
        socket.on('disconnect', async (data) => {
                const index = listOnlineUser.findIndex(user => user.socket.id === socket.id);
                const id = listOnlineUser[index].userID;
                await Presence.findOneAndUpdate({ userID: id }, {
                        $set: {
                                presence: false,
                        }
                });
                console.log("disconnect " + socket.id);
                listOnlineUser.splice(index, 1);
                io.emit('updatePresence', 'updatePresence');
        });

        // Update list online user
        // io.on('disconnect', async (data) => {

        //       socket.emit("updateUserPresence", )
        // });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRouter);
app.use("/api/user", userRouter);

server.listen(port, () => {
        console.log(`listening on: *${port}`);
});
