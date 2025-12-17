import axios from "axios";
import { AppError, logger } from "devdad-express-utils";


const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:3001";

export const fetchUserProfilesFromUserService = async (userIds) => {
  if (userIds.length === 0 || !Array.isArray(userIds)) {
    logger.warn("User Ids is not valid");
    throw new AppError("User Ids is not valid", 400);
  }

  const res = await axios.post(
    `${USER_SERVICE_URL}/api/users/fetch-user-profiles`,
    { userIds }
  );

  console.log(
    "DEBUG: comments from our comment service = ",
    res.data,
  );
  return res.data;
};
