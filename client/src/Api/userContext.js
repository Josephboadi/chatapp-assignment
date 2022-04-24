import { createContext, useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import { app } from "../config/firebase.config";
import { getAuth } from "firebase/auth";
export const UserContext = createContext();

// const baseUrl = "http://localhost:4000";
const baseUrl = "https://joe-chap-app.herokuapp.com/";

let socket;

export const UserProvider = ({ children }) => {
  const firebaseAuth = getAuth(app);
  const [user, setUser] = useState(null);
  const [allUser, setAllUser] = useState([]);
  const [selectedUser, setSelectedUser] = useState();
  socket = io(baseUrl, { transports: ["websocket", "polling", "flashsocket"] });

  const firebaseSignOut = async () => {
    const userId = {
      userId: user?.userId,
    };

    firebaseAuth.signOut();

    socket.off("new_user", userId);

    window.localStorage.setItem("auth", "false");
    setUser(null);
    await axios.post(`/api/v1/user/logout`, userId);
  };

  const blockUser = async (data) => {
    const { userId, blockUserId } = data;
    await axios.post(`/api/v1/user/blockuser`, {
      userId,
      blockUserId,
    });
    firebaseAuth.onAuthStateChanged((userCred) => {
      if (userCred) {
        userCred.getIdToken().then((token) => {
          window.localStorage.setItem("auth", "true");
          validateUser(token);
        });
      } else {
        setUser(null);
        window.localStorage.setItem("auth", "false");
      }
    });
  };

  useEffect(() => {
    firebaseAuth.onAuthStateChanged((userCred) => {
      if (userCred) {
        userCred.getIdToken().then((token) => {
          window.localStorage.setItem("auth", "true");
          validateUser(token);
        });
      } else {
        setUser(null);
        window.localStorage.setItem("auth", "false");
      }
    });
  }, []);

  const validateUser = async (token) => {
    const res = await axios.get(`/api/v1/user/login`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    window.localStorage.setItem("auth", "true");
    setUser(res?.data?.user);
    if (res?.data?.user?.userId) {
      const resUser = await axios.get(
        `/api/v1/user/users/res?.data?.user?.userId`
      );

      socket.off("new_user").on("new_user", async (payload) => {
        let resUsers = await payload?.filter(
          (item) => item?.userId !== res?.data?.user?.userId
        );

        let finalUser = await resUsers?.filter((neUser) => {
          return !user?.blockedUsers?.find((itemB) => {
            return neUser.userId === itemB;
          });
        });

        setAllUser(finalUser);
      });

      socket.emit("new_user", { userId: res?.data?.user?.userId });
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        allUser,
        selectedUser,
        setSelectedUser,
        setAllUser,
        setUser,
        validateUser,
        firebaseSignOut,
        blockUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
