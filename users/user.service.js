const config = require("config.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../_helpers/db");
require("dotenv").config();

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  create,
  update,
  delete: _delete,
  getAll,
  getById,
  getRefreshTokens,
  getRoomsOfUser,
  updateUserRoom,
};

async function getRoomsOfUser(id) {
  const user = await getUser(id);
  return user.rooms;
}

async function create(params) {
  // return "API call vannittunde . . .";
  // validate
  if (await db.User.findOne({ where: { username: params.username } })) {
    throw 'Username "' + params.username + '" is already taken';
  }
  // hash password
  if (params.password) {
    params.passwordHash = await bcrypt.hash(params.password, 10);
  }
  // save user
  await db.User.create({ ...params, createdDate: Date.now() });
}

async function updateUserRoom(id, params) {
  const user = getUser(id);
  if (!user) throw new Error("User not found !");
  const updatedUser = await db.User.findByIdAndUpdate(
    id,
    { $set: { rooms: params } },
    { new: true }
  );
  return true;
}

async function update(id, params) {
  const user = await getUser(id);
  // validate
  const usernameChanged = params.username && user.username !== params.username;
  if (
    usernameChanged &&
    (await db.User.findOne({ where: { username: params.username } }))
  ) {
    throw 'Username "' + params.username + '" is already taken';
  }
  // hash password if it was entered
  if (params.password) {
    params.passwordHash = await bcrypt.hash(params.password, 10);
  }
  // copy params to user and save
  Object.assign(user, params);
  await user.save();
  return omitHash(user.get());
}

async function _delete(id) {
  const user = await getUser(id);
  await user.destroy();
}

async function authenticate({ username, password, ipAddress }) {
  const user = await db.User.findOne({ username });
  if (
    !user ||
    user === null ||
    !bcrypt.compareSync(password, user.passwordHash)
  ) {
    throw "Username or password is incorrect";
  }

  // authentication successful so generate jwt and refresh tokens
  const jwtToken = generateJwtToken(user);
  const refreshToken = generateRefreshToken(user, ipAddress);

  // save refresh token
  await refreshToken.save();

  // return basic details and tokens
  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  const { user } = refreshToken;

  // replace old refresh token with a new one and save
  const newRefreshToken = generateRefreshToken(user, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  // generate new jwt
  const jwtToken = generateJwtToken(user);

  // return basic details and tokens
  return {
    ...basicDetails(user),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);

  // revoke token and save
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function getAll() {
  const users = await db.User.find();
  return users.map((x) => basicDetails(x));
}

async function getById(id) {
  const user = await getUser(id);
  return basicDetails(user);
}

async function getRefreshTokens(userId) {
  // check that user exists
  await getUser(userId);

  // return refresh tokens for user
  const refreshTokens = await db.RefreshToken.find({ user: userId });
  return refreshTokens;
}

// helper functions

async function getUser(id) {
  if (!db.isValidId(id)) throw "User not found";
  const user = await db.User.findById(id);
  if (!user) throw "User not found";
  return user;
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate(
    "user"
  );
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

function generateJwtToken(user) {
  // create a jwt token containing the user id that expires in 15 minutes
  return jwt.sign({ sub: user.id, id: user.id }, process.env.SECRET_KEY, {
    expiresIn: "15m",
  });
}

function generateRefreshToken(user, ipAddress) {
  // create a refresh token that expires in 7 days
  return new db.RefreshToken({
    user: user.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(user) {
  const { id, firstName, lastName, username, role = "" } = user;
  return { id, firstName, lastName, username, role };
  // return user;
}

function omitHash(user) {
  const { hash, ...userWithoutHash } = user;
  return userWithoutHash;
}
