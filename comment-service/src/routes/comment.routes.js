import { Router } from "express";
import {
  addComment,
  replyToComment,
  fetchCommentsByPost,
  updateComment,
  toggleLike,
  toggleDislike,
  deleteComment,
  getCommentById,
} from "../controllers/comment.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import {
  createCommentValidation,
  updateCommentValidation,
} from "../utils/validation.utils.js";

const commentRouter = Router();

//NOTE: Internal Service Routes (no auth required)
commentRouter.get("/fetch-comments-by-post/:postId", fetchCommentsByPost);

commentRouter.use(authenticateUserMiddleware);
commentRouter.post("/add-comment/:postId", createCommentValidation, addComment);
commentRouter.post(
  "/add-reply/:postId",
  createCommentValidation,
  replyToComment,
);
commentRouter.put(
  "/update-comment/:commentId",
  updateCommentValidation,
  updateComment,
);
commentRouter.post("/toggle-like/:commentId", toggleLike);
commentRouter.post("/toggle-dislike/:commentId", toggleDislike);
commentRouter.delete("/delete-comment/:commentId", deleteComment);

// commentRouter.get("/get-comment/:commentId", getCommentById);
export default commentRouter;
