import { Router } from "express";
import {
  deleteNotification,
  getNotifications,
  clearAllNotifications,
  markNotificationAsRead,
} from "../controllers/notification.controllers.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const notificationRouter = Router();

notificationRouter.use(authenticateUserMiddleware);

notificationRouter.get("/get-all", getNotifications);
notificationRouter.post("/read/:notificationId", markNotificationAsRead);

notificationRouter.delete("/delete/:notificationId", deleteNotification);
notificationRouter.delete("/clear-all", clearAllNotifications);

export default notificationRouter;
