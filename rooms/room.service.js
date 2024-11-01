const db = require("../_helpers/db");
const userService = require("../users/user.service");
const jwtoken = require("jsonwebtoken");
require("dotenv").config();

module.exports = {
  joinRoom,
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoomById,
  deleteRoomById,
};

async function createRoom(params) {
  const tokenInfo = jwtoken.decode(params.headers.authorization.split(" ")[1]);
  const innerTokenInfo = jwtoken.verify(
    tokenInfo.jwtToken,
    process.env.SECRET_KEY
  );
  const user = await userService.getById(innerTokenInfo.sub);
  const createdRoom = await db.Rooms.create({
    ...params.body,
    members: [
      {
        ...user,
        role: "LEAD",
      },
    ],
  });
  const rooms = [createdRoom];
  const userUpdate = await userService.updateUserRoom(user.id, rooms);
  if (userUpdate) {
    return createdRoom;
  } else throw new Error("User updation stage failed !");
}

async function joinRoom(userId, roomId, params) {
  const joinedRoom = await updateRoomById(roomId, params);
  const rooms = [
    {
      ...joinedRoom,
      role: "MEMBER",
    },
  ];
  await userService.update(userId, rooms);
}

async function getAllRooms() {
  const rooms = await db.Rooms.find();
  return rooms.map((x) => basicDetails(x));
}

async function getRoomById(id) {
  const room = await getRoom(id);
  return basicDetails(room);
}

async function updateRoomById(id, params) {
  const room = await db.Rooms.findById(id);
  if (!room) {
    res.status(400);
    throw new Error("Room not found");
  }
  const updatedRoom = db.Rooms.findByIdAndUpdate(id, params, {
    new: true,
  });
  return updatedRoom;
}

async function deleteRoomById(id) {
  const filter = { _id: id };
  const result = await db.Rooms.deleteOne(filter);
  if (result.deletedCount === 1) {
    console.log("Successfully deleted one document.");
    return id;
  } else {
    console.log("No documents matched the query. Deleted 0 documents.");
    throw new Error("No matching document found");
  }
}

async function getRoom(id) {
  if (!db.isValidId(id)) throw "Room not found";
  const room = await db.Rooms.findById(id);
  if (!room) throw "User not found";
  return room;
}

function basicDetails(room) {
  const { id, roomName, roomDescription, members, createdDate } = room;
  return { id, roomName, roomDescription, members, createdDate };
}
