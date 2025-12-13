import { Router } from "express";
import {
  registerUser,
  loginUser,
  generateRefreshToken,
  logoutUser,
  fetchUserById,
} from "../controllers/user.controller.js";
import {
  loginUserValidation,
  registerUserValidation,
} from "../utils/validation.utils.js";

const userRouter = Router();

// Public auth routes (no token required)
userRouter.post("/register", registerUserValidation, registerUser);
userRouter.post("/login", loginUserValidation, loginUser);
userRouter.post("/logout", logoutUser);
userRouter.post("/refresh-token", generateRefreshToken);

//NOTE: Internal service routes
userRouter.get("/fetch-user/:userId", fetchUserById);

export default userRouter;
