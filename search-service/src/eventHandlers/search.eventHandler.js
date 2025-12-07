import { AppError, logger } from "devdad-express-utils";
import { PostSearch } from "../models/SearchPost.model.js";

export async function handlePostCreated(event) {
  const { postId, userId, searchTerm, postCreatedAt } = event;

  try {
    if ([postId, userId, searchTerm, postCreatedAt].some((item) => !item)) {
      logger.warn(`Invalid event data: ${event}`);
      throw new AppError("Invalid event data", 400);
    }

    const newSearchPost = await PostSearch.create({
      postId,
      userId,
      searchTerm,
      postCreatedAt,
    });

    if (!newSearchPost) {
      logger.warn(`Failed to create new search post`);
      throw new AppError("Failed to create new search post", 500);
    }

    logger.info(
      `New search post created: POST:${postId}-PostSearch:${newSearchPost._id.toString()}`,
    );
  } catch (error) {
    logger.error("Error handling post creation event", error);
  }
}

export async function handlePostDeleted(event) {
  const { postId, userId, mediaIds } = event;
  try {
    if ([postId, userId].some((item) => !item)) {
      logger.warn(`Invalid event data: ${event}`);
      throw new AppError("Invalid event data", 400);
    }

    const postSearchToDelete = await PostSearch.findOneAndDelete({ postId });

    if (!postSearchToDelete) {
      logger.warn(
        `Failed to delete related post search document for post: ${postId}`,
      );
      throw new AppError(
        `Failed to delete related post search document for post: ${postId}`,
        500,
      );
    }

    logger.info(
      `Post search deleted: [POST:${postId}]-[PostSearch:${postSearchToDelete._id.toString()}]`,
    );
  } catch (error) {
    logger.error("Error handling post deletion event", error);
  }
}
