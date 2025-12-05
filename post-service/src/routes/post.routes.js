import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  createPost,
  getPostById,
  getPosts,
} from "../controllers/post.controller.js";

const postRouter = Router();

postRouter.use(authenticateUserMiddleware);

postRouter.post("/create-post", createPost);
postRouter.get("/get-posts", getPosts);
postRouter.get("/get-post/:id", getPostById);

export default postRouter;
