import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  uploadMedia,
  fetchUserMedia,
} from "../controllers/media.controller.js";

const mediaRouter = Router();

// mediaRouter.use(authenticateUserMiddleware);

mediaRouter.post(
  "/upload-user-media",
  upload.fields([
    { name: "profile_photo", maxcount: 1 },
    { name: "cover_photo", maxcount: 1 },
  ]),
  authenticateUserMiddleware,
  uploadMedia,
);

mediaRouter.get(
  "/fetch-user-media/:userId",
  authenticateUserMiddleware,
  fetchUserMedia,
);

export default mediaRouter;
