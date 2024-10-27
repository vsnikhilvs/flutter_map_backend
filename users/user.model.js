const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: false },
  createdDate: { type: String, required: false, default: Date.now() },
  avatar: { type: String, required: false, default: '' },
});

schema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    // remove these props when object is serialized
    delete ret._id;
    delete ret.passwordHash;
  },
});

module.exports = mongoose.model("User", schema);
