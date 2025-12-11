import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  createPost,
  deletePostById,
  getPostById,
  getPosts,
} from "../controllers/post.controller.js";
import { upload } from "../utils/multer.utils.js";
import { validateNewPostCreation } from "../utils/validation.utils.js";
import { validationResult } from "express-validator";

const postRouter = Router();

postRouter.use(authenticateUserMiddleware);

postRouter.post(
  "/create-post",
  upload.fields([{ name: "images", maxCount: 4 }]),
  validateNewPostCreation,
  createPost,
);
postRouter.get("/get-posts", getPosts);
postRouter.get("/get-post/:id", getPostById);
postRouter.delete("/delete-post/:id", deletePostById);

export default postRouter;
