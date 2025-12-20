import { Router } from "express";
import { getNotifications } from "../controllers/notification.controllers.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const notificationRouter = Router();

notificationRouter.use(authenticateUserMiddleware);

notificationRouter.get("/get-all", getNotifications);

export default notificationRouter;
