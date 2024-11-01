const express = require("express");
const verifyToken = require("../_middleware/authorize");
const roomService = require("./room.service");

const router = express.Router();

// routes
router.post("/create", verifyToken(), createRoom);
router.get("/", verifyToken(), getAllRooms);
router.get("/:id", verifyToken(), getRoomById);
router.put("/:id", verifyToken(), updateRoomById);
router.delete("/:id", verifyToken(), deleteRoomById);

module.exports = router;

function createRoom(req, res, next) {
  roomService
    .createRoom(req)
    .then((room) =>
      res.json({
        message: "Room creation success",
        data: room,
      })
    )
    .catch((err) => next(err));
}

function getAllRooms(req, res, next) {
  roomService
    .getAllRooms()
    .then((rooms) => res.json({ data: rooms }))
    .catch(next);
}

function getRoomById(req, res, next) {
  roomService
    .getRoomById(req.params.id)
    .then((room) => (room ? res.json({ data: room }) : res.sendStatus(404)))
    .catch(next);
}

function updateRoomById(req, res, next) {
  roomService
    .updateRoomById(req.params.id, req.body)
    .then((room) =>
      room
        ? res.json({ message: "Room updated successfully", data: room })
        : res.sendStatus(404)
    )
    .catch(next);
}

function deleteRoomById(req, res, next) {
  roomService
    .deleteRoomById(req.params.id)
    .then((room) =>
      room
        ? res.json({ message: "Room deleted successfully", data: room })
        : res.sendStatus(404)
    )
    .catch(next);
}
