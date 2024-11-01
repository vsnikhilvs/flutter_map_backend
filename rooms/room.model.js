const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema({
  roomName: { type: String, required: true },
  roomDescription: { type: String, required: false },
  members: { type: Array, required: true, default: [] },
  createdDate: { type: String, required: false, default: Date.now() },
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
});

module.exports = mongoose.model("Rooms", schema);
