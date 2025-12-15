import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://post-service:3002";

export const fetchUserFromUserServiceById = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new AppError("Post Id is not valid", 400);
  }

  try {
    const res = await axios.get(
      `${USER_SERVICE_URL}/api/users/fetch-user/${userId}`,
    );
    console.log(res.data);
    return res.data;
  } catch (error) {
    logger.error("Failed to fetch post by id", { error });
    throw new AppError("Failed to fetch post by id", 500);
  }
};
