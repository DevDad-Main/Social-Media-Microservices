import { Router } from "express";
import {
  registerUser,
  loginUser,
  generateRefreshToken,
  logoutUser,
  getUserProfile,
} from "../controllers/user.controller.js";
import {
  loginUserValidation,
  registerUserValidation,
} from "../utils/validation.utils.js";

const userRouter = Router();

userRouter.post("/register", registerUserValidation, registerUser);
userRouter.post("/login", loginUserValidation, loginUser);
userRouter.post("/logout", logoutUser);
userRouter.post("/refresh-token", generateRefreshToken);
userRouter.get("/profile/:id", getUserProfile);

export default userRouter;
