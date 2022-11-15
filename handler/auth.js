const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const authUser = (req, res, next) => {
  const userToken = req.header("authToken");
  if (!userToken) {
    res.status(401).send({ error: "no token found" });
  }
  try {
    let data = jwt.verify(userToken, JWT_SECRET);
    if (!data.user.verified) {
      return res.status(401).send({ error: "not verified" })
    }
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).send({ error: "invalid token" });
  }
};

module.exports = authUser;
