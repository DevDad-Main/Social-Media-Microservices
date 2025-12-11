import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  uploadUsersProfileMedia,
  fetchUserMedia,
  uploadUpdatedUserProfileMedia,
  uploadPostMedia,
  fetchPostMedia,
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
    uploadUsersProfileMedia,
  )
  .put(
    upload.fields([
      { name: "profile_photo", maxCount: 1 },
      { name: "cover_photo", maxCount: 1 },
    ]),
    authenticateUserMiddleware,
    uploadUpdatedUserProfileMedia,
  );

//NOTE: Internal APIs
mediaRouter.post(
  "/post-media-files",
  upload.fields([{ name: "images", maxCount: 4 }]),
  uploadPostMedia,
);
mediaRouter.get("/fetch-user-media/:userId", fetchUserMedia);
mediaRouter.get("/fetch-post-media/:postId", fetchPostMedia);

export default mediaRouter;
