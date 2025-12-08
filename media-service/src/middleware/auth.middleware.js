import jwt from "jsonwebtoken";
import { catchAsync, logger, sendError, AppError } from "devdad-express-utils";
import { isValidObjectId } from "mongoose";

export const authenticateUserMiddleware = catchAsync(async (req, res, next) => {
  try {
    // const _id = req.headers["x-user-id"];

    const token =
      req.cookies.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      logger.warn(`Authentication Failed. No token found`);
      return sendError("Authentication Required, Please Try Again!", 401);
    }

    // if (!_id) {
    //   logger.warn(`Authentication Failed. No user id found`);
    //   return sendError(res, "Authentication Required, Please Try Again!", 401);
    // }
    //
    // if (!isValidObjectId(_id)) {
    //   logger.warn(`Authentication Failed. Invalid MonogDB user id: ${_id}`);
    //   return sendError(res, "Authentication Required, Please Try Again!", 401);
    // }

    logger.info(`Verifying token: ${token.substring(0, 20)}...`);

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    logger.info(`Token verified for user: ${decodedToken.userId}`);

    req.user = { _id: decodedToken.userId };
    next();
  } catch (error) {
    throw new AppError(error?.message || "Invalid access token", 401);
  }
});
