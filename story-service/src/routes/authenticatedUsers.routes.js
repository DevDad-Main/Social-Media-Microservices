import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { updateUserValidation } from "../utils/validation.utils.js";

const authenticatedUsersRouter = Router();

// Protected user routes (token required) - but we'll handle auth at gateway level
authenticatedUsersRouter.get(
  "/profile/:id",
  authenticateUserMiddleware,
  getUserProfile,
);

authenticatedUsersRouter.post(
  "/update-user",
  authenticateUserMiddleware,
  updateUserValidation,
  updateUserProfile,
);

export default authenticatedUsersRouter;
