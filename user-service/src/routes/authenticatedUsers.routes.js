import { Router } from "express";
import {
  getUserConnections,
  getUserProfile,
  updateUserProfile,
  sendConnectionRequest,
  followUser,
  unfollowUser,
  acceptConnectionRequests,
} from "../controllers/user.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { updateUserValidation } from "../utils/validation.utils.js";

const authenticatedUsersRouter = Router();

authenticatedUsersRouter.use(authenticateUserMiddleware);

// Protected user routes (token required) - but we'll handle auth at gateway level
authenticatedUsersRouter.get("/profile/:id", getUserProfile);

authenticatedUsersRouter.post(
  "/update-user",
  updateUserValidation,
  updateUserProfile,
);

authenticatedUsersRouter.get("/connections", getUserConnections);
authenticatedUsersRouter.post("/follow", followUser);
authenticatedUsersRouter.post("/unfollow", unfollowUser);
authenticatedUsersRouter.post("/connect", sendConnectionRequest);
authenticatedUsersRouter.post("/accept", acceptConnectionRequests);

export default authenticatedUsersRouter;
