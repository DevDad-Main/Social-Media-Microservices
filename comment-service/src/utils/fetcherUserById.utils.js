import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:3001";

export const fetchUserFromUserServiceById = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new AppError("User Id is not valid", 400);
  }

  try {
    const res = await axios.get(
      `${USER_SERVICE_URL}/api/users/fetch-user/${userId}`,
    );
    console.log(res.data);
    return res.data;
  } catch (error) {
    logger.error("Failed to fetch user by id", { error });
    throw new AppError("Failed to fetch user by id", 500);
  }
};
