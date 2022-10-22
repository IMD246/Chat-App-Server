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
const Message = require("./models/Message");
const Chat = require('./models/Chat');
dotenv.config();

const { Server } = require("socket.io");
const Presence = require("./models/Presence");
const SourceChat = require("./models/SourceChat");
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

        socket.on('getSourceChat', async data => {
                const sourceChat = await SourceChat.findOne({ idRoom: data.roomID });
                socket.emit('getSourceChat', sourceChat ?? null);
        });

        // Recevie a message      
        socket.on("message", async (msg) => {
                let sourceChat = await SourceChat.findOne({ idRoom: msg.idRoom });
                if (!sourceChat) {
                        const initChat = [msg.message];
                        await new SourceChat({
                                idRoom: msg.idRoom,
                                sourceChat: [initChat],
                        }).save();
                        sourceChat = await SourceChat.findOne({ idRoom: msg.idRoom });
                } else {
                        let lastMsg = sourceChat.sourceChat.at(-1);
                        const idSenderOfLastMsg = lastMsg[0].idSender;
                        idSenderOfLastMsg === msg.idUser
                                ? sourceChat.sourceChat.at(-1).push(msg.message)
                                : sourceChat.sourceChat.push(msg.message);

                        await SourceChat.updateOne({ idRoom: msg.idRoom }, {
                                $set: {
                                        sourceChat: sourceChat.sourceChat,
                                }
                        });
                }

                let mess = listUserOnline.findIndex(user => user.userID === msg.idTarget);
                if (mess != -1) {
                        listUserOnline[mess].socket.emit("getSourceChat", sourceChat);
                }
                socket.emit("getSourceChat", sourceChat);
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
                const user = listUserOnline[index];
                await Presence.findOneAndUpdate({ userID: user.userID }, {
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


// io.on('connection', function(socket) {
//       socket.on('disconnect', (data) => {
//             console.log('Got disconnect! ');
//             console.log('ID: '+ socket.id);
//       });
//    socket.on('updateUserPresence', (data)=>console.log('data: '+data));
// });
