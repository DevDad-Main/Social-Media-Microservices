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

//NOTE: Internal service routes (no auth required)
userRouter.get("/fetch-user/:userId", fetchUserById);

// Public auth routes (no token required)
userRouter.post("/register", registerUserValidation, registerUser);
userRouter.post("/login", loginUserValidation, loginUser);
userRouter.post("/logout", logoutUser);
userRouter.post("/refresh-token", generateRefreshToken);

export default userRouter;
