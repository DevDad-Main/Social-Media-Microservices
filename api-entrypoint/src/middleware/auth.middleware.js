import { logger, sendError } from "devdad-express-utils";
import jwt from "jsonwebtoken";

export const validateUserToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("No token found in Authorization Header");
    return sendError(res, "No token found in Authorization Header", 401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    if (error) {
      logger.warn("Token verification failed");
      return sendError(res, "Token verification failed", 401);
    }

    req.user = {
      _id: user.userId,
      username: user.username,
    };
    return next();
  });
};
