import { Router } from "express";
import { addComment } from "../controllers/comment.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const commentRouter = Router();

commentRouter.use(authenticateUserMiddleware);

commentRouter.post("/add-comment/:postId", addComment);
// commentRouter.post("/add-reply", verifyJWT, replyToComment);
// commentRouter.post("/toggle-like", verifyJWT, toggleLike);
// commentRouter.post("/toggle-dislike", verifyJWT, toggleDislike);
export default commentRouter;
