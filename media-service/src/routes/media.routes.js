import { Router } from "express";
import { upload } from "../utils/multer.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { uploadMedia } from "../controllers/media.controller.js";

const mediaRouter = Router();

mediaRouter.use(authenticateUserMiddleware);

mediaRouter.post(
  "/upload-media",
  authenticateUserMiddleware,
  upload.single("file"),
  uploadMedia,
);

export default mediaRouter;
