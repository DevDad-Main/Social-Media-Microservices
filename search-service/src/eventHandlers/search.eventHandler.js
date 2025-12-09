import { AppError, logger } from "devdad-express-utils";
import { PostSearch } from "../models/SearchPost.model.js";
import { UserSearch } from "../models/SearchUser.model.js";

//#region Handle Post Created Event
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
    logger.error("Error handling post creation event", { error });
    throw new AppError("Error handling post creation event", 500);
  }
}
//#endregion

//#region Handle Post Deleted Event
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
//#endregion

//#region Handle User Created Event
export async function handleUserCreated(event) {
  const { userId, searchTerm, userCreatedAt } = event;

  try {
    if ([userId, searchTerm, userCreatedAt].some((item) => !item)) {
      logger.warn(`Invalid event data: ${event}`);
      throw new AppError("Invalid event data", 400);
    }

    const newUserSearch = await UserSearch.create({
      userId,
      searchTerm,
      userCreatedAt,
    });

    if (!newUserSearch) {
      logger.warn(`Failed to create new searchable user`);
      throw new AppError("Failed to create new searchable user", 500);
    }

    logger.info(
      `New User Search created: User:${userId}-UserSearch:${newUserSearch._id.toString()}`,
    );
  } catch (error) {
    logger.error("Error handling user creation event", { error });
    throw new AppError("Error handling user creation event", 500);
  }
}
//#endregion

//#region Handle User Updated Event
export async function handleUserUpdated(event) {
  const { userId, searchTerm } = event;

  try {
    const userSearchToUpdate = await UserSearch.findOneAndUpdate(
      { userId },
      { searchTerm },
    );

    if (!userSearchToUpdate) {
      logger.warn(`Failed to update searchable user`);
      throw new AppError("Failed to create new searchable user", 500);
    }

    logger.info(
      `Updated User Search: User:${userId}-UserSearch:${userSearchToUpdate._id.toString()}`,
    );
  } catch (error) {
    logger.error("Error handling user updated event", { error });
    throw new AppError("Error handling user updated event", 500);
  }
}
//#endregion
