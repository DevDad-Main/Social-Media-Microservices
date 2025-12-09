import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  uploadMedia,
  fetchUserMedia,
  uploadUpdatedUserMedia,
} from "../controllers/media.controller.js";

const mediaRouter = Router();

// mediaRouter.use(authenticateUserMiddleware);

mediaRouter
  .route("/upload-user-media")
  .post(
    upload.fields([
      { name: "profile_photo", maxcount: 1 },
      { name: "cover_photo", maxcount: 1 },
    ]),
    authenticateUserMiddleware,
    uploadMedia,
  )
  .put(
    upload.fields([
      { name: "profile_photo", maxCount: 1 },
      { name: "cover_photo", maxCount: 1 },
    ]),
    authenticateUserMiddleware,
    uploadUpdatedUserMedia,
  );

mediaRouter.get("/fetch-user-media/:userId", fetchUserMedia);

export default mediaRouter;
