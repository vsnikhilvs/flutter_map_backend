const express = require("express");
const Joi = require("@hapi/joi");
const validateRequest = require("../_middleware/validate-request");
const verifyToken = require("../_middleware/authorize");
const userService = require("./user.service");
const jwtoken = require("jsonwebtoken");

const router = express.Router();

router.post("/authenticate", authenticateSchema, authenticate);
router.post("/register", register);
router.get("/", verifyToken(), getAll);
router.get("/current", verifyToken(), getCurrent);
router.get("/:id", verifyToken(), getById);
router.put("/:id", verifyToken(), update);
router.delete("/:id", verifyToken(), _delete);
router.post("/refresh-token", refreshToken);
router.post("/revoke-token", verifyToken(), revokeTokenSchema, revokeToken);
router.get("/:id/refresh-tokens", verifyToken(), getRefreshTokens);
router.get("/:id/rooms", verifyToken(), getUserRooms);

module.exports = router;

async function getUserRooms(req, res, next) {
  userService
    .getRoomsOfUser(req.params.id)
    .then((rooms) => {
      res.json({
        message: "Rooms of user fetched successfully",
        data: rooms ?? [],
      });
    })
    .catch((err) => next(err));
}

function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  userService
    .authenticate({ username, password, ipAddress })
    .then(({ refreshToken, ...user }) => {
      console.log(user);
      setTokenCookie(res, refreshToken);
      res.json(user);
    })
    .catch(next);
}

function register(req, res, next) {
  userService
    .create(req.body)
    .then(() =>
      res.json({
        message: "User registration success",
      })
    )
    .catch((err) => next(err));
}

function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip;
  userService
    .refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...user }) => {
      setTokenCookie(res, refreshToken);
      res.json(user);
    })
    .catch(next);
}

function revokeTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().empty(""),
  });
  validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
  // accept token from request body or cookie
  const token = req.body.token || req.cookies.refreshToken;
  const ipAddress = req.ip;

  if (!token) return res.status(400).json({ message: "Token is required" });

  // users can revoke their own tokens and admins can revoke any tokens
  if (!req.user.ownsToken(token) && req.user.role !== "Admin") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  userService
    .revokeToken({ token, ipAddress })
    .then(() => res.json({ message: "Token revoked" }))
    .catch(next);
}

function getAll(req, res, next) {
  userService
    .getAll()
    .then((users) => res.json(users))
    .catch(next);
}

async function getCurrent(req, res, next) {
  try {
    const token =
      req.headers.authorization && req.headers.authorization.split(" ")[1];
    const tokenInfo = jwtoken.decode(token);
    const innerTokenInfo = jwtoken.verify(
      tokenInfo.jwtToken,
      process.env.SECRET_KEY
    );
    if (!innerTokenInfo || !innerTokenInfo.sub) {
      return res.status(400).json({ message: "Invalid token" });
    }
    const user = await userService.getById(innerTokenInfo.sub);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error in getCurrent function:", error);
    next(error);
  }
}

function getById(req, res, next) {
  // regular users can get their own record and admins can get any record
  if (req.params.id !== req.user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  userService
    .getById(req.params.id)
    .then((user) => (user ? res.json(user) : res.sendStatus(404)))
    .catch(next);
}

function getRefreshTokens(req, res, next) {
  // users can get their own refresh tokens and admins can get any user's refresh tokens
  if (req.params.id !== req.user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  userService
    .getRefreshTokens(req.params.id)
    .then((tokens) => (tokens ? res.json(tokens) : res.sendStatus(404)))
    .catch(next);
}

// helper functions

function setTokenCookie(res, token) {
  // create http only cookie with refresh token that expires in 7 days
  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
  res.cookie("refreshToken", token, cookieOptions);
}

function update(req, res, next) {
  userService
    .update(req.params.id, req.body)
    .then(() => res.json({}))
    .catch((err) => next(err));
}

function _delete(req, res, next) {
  userService
    .delete(req.params.id)
    .then(() => res.json({}))
    .catch((err) => next(err));
}
