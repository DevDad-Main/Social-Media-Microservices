import { Router } from "express";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { createPost } from "../controllers/post.controller";

const postRouter = Router();

postRouter.use(authenticateUserMiddleware);

postRouter.route("/create-post", createPost);

export default postRouter;
