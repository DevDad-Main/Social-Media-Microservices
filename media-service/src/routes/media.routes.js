import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { uploadMedia } from "../controllers/media.controller.js";

const mediaRouter = Router();

mediaRouter.use(authenticateUserMiddleware);

mediaRouter.post(
  "/upload-media/user-register",
  upload.fields([
    { name: "profile_picture", maxcount: 1 },
    { name: "cover_photo", maxcount: 1 },
  ]),
  uploadMedia,
);

export default mediaRouter;
