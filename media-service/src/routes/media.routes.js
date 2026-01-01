import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  uploadUsersProfileMedia,
  fetchUserMedia,
  uploadUpdatedUserProfileMedia,
  uploadPostMedia,
  fetchPostMedia,
  uploadStoryMedia,
  uploadRegistrationUserMedia,
} from "../controllers/media.controller.js";

const mediaRouter = Router();

//#region Internal APIs
mediaRouter.post(
  "/post-media-files",
  upload.fields([{ name: "images", maxCount: 4 }]),
  uploadPostMedia,
);

mediaRouter.post("/story-media-file", upload.single("media"), uploadStoryMedia);

//NOTE: Registration media upload (special route for new users)
mediaRouter.post(
  "/registration-user-media",
  upload.fields([
    { name: "profile_photo", maxCount: 1 },
    { name: "cover_photo", maxCount: 1 },
  ]),
  uploadRegistrationUserMedia,
);

mediaRouter.get("/fetch-user-media/:userId", fetchUserMedia);
mediaRouter.get("/fetch-post-media/:postId", fetchPostMedia);
//#endregion

mediaRouter.use(authenticateUserMiddleware);

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

export default mediaRouter;
