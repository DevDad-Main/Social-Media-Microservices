import { Router } from "express";
import { addComment, replyToComment, fetchCommentsByPost } from "../controllers/comment.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const commentRouter = Router();

//NOTE: Internal Service Routes (no auth required)
commentRouter.get("/fetch-comments-by-post/:postId", fetchCommentsByPost);


commentRouter.use(authenticateUserMiddleware);
commentRouter.post("/add-comment/:postId", addComment);
commentRouter.post("/add-reply/:postId", replyToComment);

// commentRouter.post("/toggle-like", verifyJWT, toggleLike);
// commentRouter.post("/toggle-dislike", verifyJWT, toggleDislike);
export default commentRouter;
