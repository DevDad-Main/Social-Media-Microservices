import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  createPost,
  deletePostById,
  getPostById,
  getPosts,
  togglePostLike,
} from "../controllers/post.controller.js";
import { upload } from "../utils/multer.utils.js";
import { validateNewPostCreation } from "../utils/validation.utils.js";

const postRouter = Router();

postRouter.use(authenticateUserMiddleware);

postRouter.post(
  "/create-post",
  upload.array("images", 4),
  validateNewPostCreation,
  createPost,
);
postRouter.get("/get-posts", getPosts);
postRouter.get("/get-post/:id", getPostById);
postRouter.post("/toggle-post-like/:postId", togglePostLike);
postRouter.delete("/delete-post/:id", deletePostById);

export default postRouter;
