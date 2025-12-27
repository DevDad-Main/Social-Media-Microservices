import axios from "axios";
import { AppError } from "devdad-express-utils";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

export const fetchMediaByUserId = async (userId) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new AppError("User Id is not valid", 400);
    }

    const res = await axios.get(
      `${MEDIA_SERVICE_URL}/api/media/fetch-user-media/${userId}`,
    );

    console.log("DEBUG: User Fetch Media Response ", res);

    return res.data;
  } catch (error) {
    logger.error("Failed to fetch media by userId:", { error });
    throw error;
  }
};
