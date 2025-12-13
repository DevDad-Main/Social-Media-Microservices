import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:3001";

//#region Get User by ID from User Service
export const getUserByIdFromUserService = async (userId) => {
  if (!userId || typeof userId !== "string") {
    logger.warn("User ID is not valid");
    throw new AppError("User ID is not valid", 400);
  }

  try {
    const res = await axios.get(
      `${USER_SERVICE_URL}/api/auth/fetch-user/${userId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return res.data.data;
  } catch (error) {
    logger.error("Failed to fetch user from user service", { error });
    throw new AppError("Failed to fetch user", 500);
  }
};
//#endregion

