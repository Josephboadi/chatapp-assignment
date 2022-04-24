import React, { createContext, useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
// const baseUrl = "http://localhost:4000";
const baseUrl = "https://joe-chap-app.herokuapp.com/";

let socket;

export const MsgContext = createContext();

export const MsgProvider = ({ children }) => {
  socket = io(baseUrl, { transports: ["websocket", "polling", "flashsocket"] });
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState({});
  const [newMessages, setNewMessages] = useState(0);

  const getUserMessages = async (data1) => {
    const { userId, myId } = data1;
    const res = await axios.get(`/api/v1/msg/msg/${userId}/${myId}`);

    setMessages(res?.data?.privateMsg);
  };

  const createMessage = async (body) => {
    const { userId, message, myId, sender, time, date } = body;
    await axios.post(`/api/v1/msg/createmsg`, {
      userId,
      message,
      sender,
      myId,
      time,
      date,
    });
  };

  return (
    <MsgContext.Provider
      value={{
        socket,
        users,
        setUsers,
        userId,
        setUserId,
        messages,
        setMessages,
        privateMessages,
        setPrivateMessages,
        newMessages,
        setNewMessages,
        getUserMessages,
        createMessage,
      }}
    >
      {children}
    </MsgContext.Provider>
  );
};
