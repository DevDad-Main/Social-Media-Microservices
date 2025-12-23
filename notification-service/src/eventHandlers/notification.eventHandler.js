import { AppError, logger } from "devdad-express-utils";
import { isValidObjectId } from "mongoose";
import { Notification } from "../models/Notification.model.js";

function handleIncomingEventDataValidation(event) {
  const { user, from, type, entityId } = event;

  if (
    !isValidObjectId(user) ||
    !isValidObjectId(from) ||
    !isValidObjectId(entityId)
  ) {
    logger.warn("WARN: Invalid Object ID", { user, from, entityId });
    throw new AppError("Invalid Object ID", 400);
  }

  if (
    typeof type !== "string" ||
    !["message", "like", "comment", "connection"].includes(type)
  ) {
    logger.warn("WARN: Invalid Type", { type });
    throw new AppError("Invalid Type", 400);
  }

  return { user, from, type, entityId };
}

//#region Handle Post Liked Event
export async function handlePostLikedEvent(event) {
  console.log("DEBUG: handlePostLikedEvent", event);
  try {
    const { user, from, type, entityId } =
      handleIncomingEventDataValidation(event);

    const notification = await Notification.create({
      user,
      from,
      type,
      entityId,
    });

    logger.info("Post liked event handled successfully", { notification });
  } catch (error) {
    logger.error(
      error?.message || error || "Failed to handle post liked event",
    );
    throw new AppError("Failed to handle post liked event", 500);
  }
}
//#endregion

//#region Handle Comment Created Event
export async function handleCommentCreatedEvent(event) {
  try {
    const { user, from, type, entityId } =
      handleIncomingEventDataValidation(event);

    const notification = await Notification.create({
      user,
      from,
      type,
      entityId,
    });

    logger.info("Comment created event handled successfully", { notification });
  } catch (error) {
    logger.error(
      error?.message || error || "Failed to handle comment created event",
    );
    throw new AppError("Failed to handle comment created event", 500);
  }
}
//#endregion

//#region Handle Connection Request Sent Event
export async function handleConnectionRequestSent(event) {
  try {
    const { user, from, type, entityId } =
      handleIncomingEventDataValidation(event);

    const notification = await Notification.create({
      user,
      from,
      type,
      entityId,
    });

    logger.info("Comment created event handled successfully", { notification });
  } catch (error) {
    logger.error(
      error?.message || error || "Failed to handle comment created event",
    );
    throw new AppError("Failed to handle comment created event", 500);
  }
}
//#endregion
