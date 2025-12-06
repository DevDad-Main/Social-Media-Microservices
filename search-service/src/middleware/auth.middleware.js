import { catchAsync, logger, sendError } from "devdad-express-utils";
import { isValidObjectId } from "mongoose";

export const authenticateUserMiddleware = catchAsync(async (req, res, next) => {
  const _id = req.headers["x-user-id"];

  if (!_id) {
    logger.warn(`Authentication Failed. No user id found`);
    return sendError(res, "Authentication Required, Please Try Again!", 401);
  }

  if (!isValidObjectId(_id)) {
    logger.warn(`Authentication Failed. Invalid MonogDB user id: ${_id}`);
    return sendError(res, "Authentication Required, Please Try Again!", 401);
  }

  req.user = { _id };
  return next();
});
