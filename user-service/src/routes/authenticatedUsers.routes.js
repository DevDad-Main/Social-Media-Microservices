import { Router } from "express";
import { getUserProfile } from "../controllers/user.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const authenticatedUsersRouter = Router();

// Protected user routes (token required) - but we'll handle auth at gateway level
authenticatedUsersRouter.get(
  "/profile/:id",
  authenticateUserMiddleware,
  getUserProfile,
);

export default authenticatedUsersRouter;
