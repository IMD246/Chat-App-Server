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
dotenv.config();

const { Server } = require("socket.io");
const Presence = require("./models/Presence");
const SourceChat = require("./models/SourceChat");
const Room = require("./models/Room");
app.use(express.json());

mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
}).then(console.log("connected to MongGoDB")).catch((error) => console.log(error));


// SocketIO
const io = new Server(server);

var listUserOnline = [];
io.on("connection", (socket) => {
        // Join app
        socket.on("joinApp", async userID => {
                console.log("join app " + socket.id);
                listUserOnline.push(new UserJoinApp(socket, userID));
        });
        // Get source chat by roomID
        socket.on('getSourceChat', async data => {
                const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                socket.emit('getSourceChat', sourceChat ?? null);
        });
        // Recevie a message      
        socket.on("message", async (msg) => {
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
                                sourceChat[msg.message.time] = [msg.message];
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

                let mess = listUserOnline.findIndex(user => user.userID === msg.idTarget);
                if (mess != -1) {
                        listUserOnline[mess].socket.emit("getSourceChat", sourceChatDoc);
                }
                socket.emit("getSourceChat", sourceChatDoc);
        });

        socket.on("addFriendRequest", async (listUserID) => {
                // find socket
                let index = listUserOnline.findIndex(user => user.userID === listUserID.friendID);
                if (index == null) return;

                // update request
                let requests = [];
                let friendRequests = await Friends.findOne({ userID: listUserID.friendID });
                friendRequests.request.push(listUserID.userID);
                for (const element of friendRequests.request) {
                        let user = await User.findOne({ _id: element });
                        requests.push(user);
                }
                listUserOnline[index].socket.emit("friendRequest", requests);
                await friendRequests.save();
        });

        // A user was offline 
        socket.on('disconnect', async (data) => {
                const index = listUserOnline.findIndex(user => user.socket.id === socket.id);
                const id = listUserOnline[index].userID;
                await Presence.findOneAndUpdate({ userID: id }, {
                        $set: {
                                presence: false,
                        }
                });
                listUserOnline.splice(index, 1);
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
