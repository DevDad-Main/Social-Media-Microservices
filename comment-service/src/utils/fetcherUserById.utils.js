import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:3001";

export const fetchUserFromUserServiceById = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new AppError("User Id is not valid", 400);
  }

  try {
    logger.info("Attempting to fetch user", { userId, url: `${USER_SERVICE_URL}/api/users/fetch-user/${userId}` });
    const res = await axios.get(
      `${USER_SERVICE_URL}/api/users/fetch-user/${userId}`,
      { timeout: 5000 } // 5 second timeout
    );
    logger.info("Successfully fetched user", { data: res.data });

    const sortedUserData = {
      username: res.data.data.username,
      profilePicture: res.data.data.profilePhoto,
    };

    return sortedUserData;
    // return res.data;
  } catch (error) {
    logger.error("Failed to fetch user by id", { error: error.message, code: error.code });
    throw new AppError("Failed to fetch user by id", 500);
  }
};
