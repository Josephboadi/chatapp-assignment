require("dotenv").config();
const express = require("express");
const asyncHandler = require("express-async-handler");
const connectDatabase = require("./config/database");
const Users = require("./models/Users");
const Message = require("./models/Messages");
const path = require("path");

// Connecting to database
connectDatabase();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const userRoute = require("./routes/user");
const msgRoute = require("./routes/messages");

// User Authentication Route
app.use("/api/v1/user/", userRoute);

// Message Route
app.use("/api/v1/msg/", msgRoute);

// ---------Deployment--------------
const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/client/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "client", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

const PORT = process.env.PORT || 4000;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);

// ----------------Deployment----------------

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    // credentials: true,
  },
});

// -----------Function to get messages--------

async function getLastMessagesByUserId(data1) {
  let privateMessages = await Message.aggregate([
    { $match: { $or: [{ to: data1.userId }, { to: data1.myId }] } },
    { $group: { _id: "$date", messagesByDate: { $push: "$$ROOT" } } },
  ]);
  return privateMessages;
}
// -----------Function to get messages--------

// -----Function to Sort Messages by Date----

function sortPrivateMessagesByDate(messages) {
  return messages.sort(function (a, b) {
    let date1 = a._id.split("/");
    let date2 = b._id.split("/");

    date1 = date1[2] + date1[0] + date1[1];
    date2 = date2[2] + date2[0] + date2[1];

    return date1 < date2 ? -1 : 1;
  });
}

// -----Function to Sort Messages by Date----

// ..........Connection to Socket .io........

io.on("connection", (socket) => {
  // --------get all logged in users-----
  socket.on(
    "new_user",
    asyncHandler(async () => {
      const users = await Users.find({ status: "online" });

      io.emit("new_user", users);
    })
  );

  // ---------Connect to user to chat with---

  socket.on(
    "join_user",
    asyncHandler(async (data1) => {
      socket.join(data1.userId);
      const user = await Users.findOne({ userId: data1.userId });
      user?.newMessages.pull(data1.myId);
      await user?.save();

      const users = await Users.find({ status: "online" });

      socket.broadcast.emit("new_user", users);

      let privateMessages = await getLastMessagesByUserId(data1);
      privateMessages = sortPrivateMessagesByDate(privateMessages);
      socket.emit("private_messages", privateMessages);
    })
  );

  // ---------Send a message to a user----

  socket.on(
    "message_user",
    asyncHandler(async ({ userId, myId, message, sender, time, date }) => {
      const data1 = {
        userId: userId,
        myId: myId,
      };

      const user = await Users.findOne({ userId: myId });
      user?.newMessages?.push(userId);
      await user.save();

      const newMessage = await Message.create({
        message,
        from: sender,
        sender: myId,
        time,
        date,
        to: userId,
      });
      let privateMessages = await getLastMessagesByUserId(data1);
      privateMessages = sortPrivateMessagesByDate(privateMessages);

      io.to(userId).emit("user_messages", privateMessages);

      io.to(myId).emit("user_messages", privateMessages);

      const users = await Users.find({ status: "online" });

      socket.broadcast.emit("new_user", users);

      socket.broadcast.emit("notification", myId);
    })
  );

  // ---------logout route--------------

  app.post(
    "/api/v1/user/logout",
    asyncHandler(async (req, res) => {
      try {
        const { userId } = req.body;

        const user = await Users.findOne({ userId: userId });

        user.status = "offline";

        await user.save();
        const users = await Users.find({ status: "online" });

        socket.broadcast.emit("new_user", users);

        socket.leave(userId);

        res.status(200).send();
      } catch (error) {
        res.status(400).send();
      }
    })
  );

  // --------blockuser route -----------
  app.post(
    "/api/v1/user/blockuser",
    asyncHandler(async (req, res) => {
      try {
        const { userId, blockUserId } = req.body;

        const user = await Users.findOne({ userId: blockUserId });
        user.blockedStatus = true;
        user?.blockedUsers.push(userId);
        await user?.save();

        const users = await Users.find({ status: "online" });

        socket.broadcast.emit("new_user", users);

        res.status(200).send();
      } catch (error) {
        res.status(400).send();
      }
    })
  );

  socket.off("sign_out", ({ userId }) => {
    console.log("user disconnected");
    socket.leave(userId);
  });
});

// ..........Connection to Socket .io........
