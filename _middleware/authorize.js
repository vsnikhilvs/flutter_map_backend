const { expressjwt: jwtExpress } = require("express-jwt");
const userService = require("../users/user.service");
const jwtoken = require("jsonwebtoken");

module.exports = jwt;

function jwt() {
  const secret = process.env.SECRET_KEY;
  return jwtExpress({ secret, algorithms: ["HS256"], isRevoked }).unless({
    path: ["/users/authenticate", "/users/register"],
  });
}

async function isRevoked(req, payload) {
  try {
    const tokenInfo = await jwtoken.verify(
      payload.payload.jwtToken,
      process.env.SECRET_KEY
    );
    const user = await userService.getById(tokenInfo.sub);
    return !user; // Return true if the user is not found (token should be revoked)
  } catch (error) {
    console.log("error: ", error);
    return true; // Revoke token if an error occurs
  }
}
