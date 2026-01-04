import { Router } from "express";
import {
  registerUser,
  loginUser,
  generateRefreshToken,
  logoutUser,
  fetchUserById,
  fetchUserProfiles,
  verifyUserOTP,
  createUserAccountWithGoogle,
} from "../controllers/user.controller.js";
import {
  loginUserValidation,
  registerUserValidation,
  verifyUserRegisterValidation,
} from "../utils/validation.utils.js";
import { upload } from "../utils/multer.utils.js";

const userRouter = Router();

//NOTE: Internal service routes (no auth required)
userRouter.get("/fetch-user/:userId", fetchUserById);
userRouter.post("/fetch-user-profiles", fetchUserProfiles);

// Public auth routes (no token required)
userRouter.post(
  "/register",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "cover_photo", maxCount: 1 },
  ]),
  registerUserValidation,
  registerUser,
);

userRouter.post("/google-login", createUserAccountWithGoogle);

userRouter.post(
  "/verify-registration",
  verifyUserRegisterValidation,
  verifyUserOTP,
);
userRouter.post("/login", loginUserValidation, loginUser);
userRouter.post("/logout", logoutUser);
userRouter.post("/refresh-token", generateRefreshToken);

export default userRouter;
