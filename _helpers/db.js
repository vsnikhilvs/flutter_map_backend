const mongoose = require("mongoose");

const connectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose.connect(
  "mongodb://localhost:27017/flutter_map_backend",
  connectionOptions
);
mongoose.Promise = global.Promise;

module.exports = {
  User: require("../users/user.model"),
  RefreshToken: require("../users/refresh-token.model"),
  Rooms: require("../rooms/room.model"),
  isValidId,
};

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}
