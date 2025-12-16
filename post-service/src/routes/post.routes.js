import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  createPost,
  deletePostById,
  fetchPostById,
  getPostById,
  getPosts,
  togglePostLike,
} from "../controllers/post.controller.js";
import { upload } from "../utils/multer.utils.js";
import { validateNewPostCreation } from "../utils/validation.utils.js";

const postRouter = Router();

//NOTE: Internal Service Routes (no auth required)
postRouter.get("/fetch-post-by-id/:postId", fetchPostById)

//NOTE: Protected routes (auth required)
postRouter.use(authenticateUserMiddleware);

postRouter.post(
  "/create-post",
  // upload.array("images", 4),
  //NOTE: Temporary as postman dosent allow an array of files, we have to add multiple files with same name
  upload.fields([{ name: "images", maxCount: 4 }]),
  validateNewPostCreation,
  createPost,
);
postRouter.get("/get-posts", getPosts);
postRouter.get("/get-post/:id", getPostById);
postRouter.post("/toggle-post-like/:postId", togglePostLike);
postRouter.delete("/delete-post/:id", deletePostById);

export default postRouter;
