import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineLogout } from "react-icons/ai";
import { UserContext } from "../Api/userContext";
import "../screens/Chat/Chat.css";
import { MsgContext } from "../Api/msgContext";

const Sidebar = () => {
  const {
    user,
    setUser,
    allUser,
    firebaseSignOut,
    setAllUser,
    setSelectedUser,
  } = useContext(UserContext);
  const { socket, setMessages, userId, setUserId } = useContext(MsgContext);
  const [myUserId, setMyUserId] = useState(user?.userId);

  const [active, setActive] = useState();
  useEffect(() => {
    if (user !== null) {
      const data1 = {
        userId: userId,
        myId: user.userId,
      };
      socket.emit("join_user", data1);
      socket.emit("new_user", { userId: userId });
    }
  }, [userId]);

  socket.off("private_messages").on("private_messages", (privateMessages) => {
    setMessages(privateMessages);
  });

  socket.off("new_user").on("new_user", async (payload) => {
    const resUsers = await payload?.filter(
      (item) => item?.userId !== user?.userId
    );

    let finalUser = await resUsers.filter((neUser) => {
      return !user?.blockedUsers?.find((itemB) => {
        return neUser.userId === itemB;
      });
    });

    setAllUser(finalUser);
  });

  const navigate = useNavigate();

  const handleSignOut = () => {
    firebaseSignOut();
    setUser(null);
    navigate("/login");
  };

  const handleSelectUser = (data) => {
    const { userId, rowIndex } = data;
    const data1 = {
      userId: userId,
      myId: user.userId,
    };

    setActive(rowIndex);

    const userData = allUser?.filter((userd) => userd?.userId === userId);

    setSelectedUser(userData[0]);
    setUserId(userData[0].userId);

    if (user !== null) {
      const data1 = {
        userId: userId,
        myId: user.userId,
      };
      socket.emit("join_user", data1);
      socket.emit("new_user", { userId: userId });
    }
  };

  // console.log(user?.userId);

  return (
    <div className='chat__sidebar'>
      <div className='side__header'>
        {user !== null && (
          <div className='side__headerImgCont'>
            <img
              width={40}
              height={40}
              style={{ borderRadius: 20 }}
              src={user?.imageURL}
              alt={user?.name}
            />
          </div>
        )}

        <p className='side__headerName'>{user?.name}</p>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            // width: 100,
            justifyContent: "space-evenly",
            // backgroundColor: "red",
            // paddingTop: 12,
            marginRight: 10,
          }}
        >
          {/* <p style={{ alignSelf: "center" }}>logout</p> */}
          <div
            onClick={handleSignOut}
            style={{
              cursor: "pointer",
              fontSize: 20,
              color: "red",
              marginLeft: 5,
            }}
          >
            <AiOutlineLogout />
          </div>
        </div>
      </div>
      <div className='side__body'></div>
      {allUser
        ?.filter((item) => {
          return !user?.blockedUsers?.find((itemB) => {
            return item.userId === itemB;
          });
        })
        ?.map((userd, index) => (
          <div
            key={index}
            className={`side__bodyItem ${
              active == allUser.indexOf(userd) ? "side__active" : ""
            }`}
            onClick={() =>
              handleSelectUser({
                userId: userd?.userId,
                rowIndex: allUser.indexOf(userd),
              })
            }
          >
            <img
              className='side__bodyImage'
              src={userd?.imageURL}
              alt='https://res.cloudinary.com/dblprzex8/image/upload/v1649530086/avatars/gnn7wyyqttyrht7xjogi.png'
            />
            <p className='side__bodyName'>{userd?.name}</p>{" "}
            {userd?.newMessages.filter((item) => item === user?.userId).length >
              0 && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 10,
                  padding: 5,
                  paddingTop: 1,
                  paddingBottom: 1,
                  backgroundColor: "green",
                  borderRadius: 15,
                  color: "white",
                }}
              >
                {
                  userd?.newMessages.filter((item) => item === user?.userId)
                    .length
                }
              </span>
            )}
          </div>
        ))}
    </div>
  );
};

export default Sidebar;
