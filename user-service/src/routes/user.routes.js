import { Router } from "express";
import {
  registerUser,
  loginUser,
  generateRefreshToken,
  logoutUser,
} from "../controllers/user.controller.js";
import { registerUserValidation } from "../utils/validation.utils.js";

const userRouter = Router();

userRouter.post("/register", registerUserValidation, registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/logout", logoutUser);
userRouter.post("/refresh-token", generateRefreshToken);

export default userRouter;
