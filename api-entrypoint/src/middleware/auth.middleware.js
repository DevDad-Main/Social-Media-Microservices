import { logger, sendError } from "devdad-express-utils";
import jwt from "jsonwebtoken";

export const validateUserToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = req.cookies?.accessToken || (authHeader && authHeader.split(" ")[1]);

  if (!token) {
    logger.warn("No token found in Authorization Header");
    return sendError(res, "No token found in Authorization Header", 401);
  }

  if (!process.env.JWT_SECRET) {
    logger.warn("No JWT_SECRET found in .env file");
    return sendError(res, "No JWT_SECRET found in .env file", 401);
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
