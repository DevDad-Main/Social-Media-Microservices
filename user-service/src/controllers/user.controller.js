import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { generateTokens } from "../utils/generateToken.utils.js";
import { User } from "../models/User.model.js";

//#region Register User
export const registerUser = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;
  const { error } = validateRegistration(req.body);

  if (error) {
    logger.warn("Registration Validation Error: ", error.details[0].message);
    return sendError(res, error.details[0].message, 400);
  }

  let user = await User.findOne({ $or: [{ username }, { email }] });

  if (user) {
    logger.warn("User Already Exists");
    return sendError(res, "User Already Exists", 400);
  }

  user = new User({
    username,
    email,
    password,
  });

  await user.save(); // NOTE: Trigger pre-save hook

  const { accesstoken, refreshToken } = await generateTokens(user);
  return sendSuccess(
    res,
    { accesstoken, refreshToken },
    "User Registered Successfully",
    201,
  );
});
//#endregion
