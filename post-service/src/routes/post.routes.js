import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { createPost } from "../controllers/post.controller.js";

const postRouter = Router();

postRouter.use(authenticateUserMiddleware);

postRouter.post("/create-post", createPost);

export default postRouter;
