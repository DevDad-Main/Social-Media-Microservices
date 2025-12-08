import axios from "axios";
import { AppError } from "devdad-express-utils";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

export const fetchMediaByUserId = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new AppError("User Id is not valid", 400);
  }

  const res = await axios.get(
    `${MEDIA_SERVICE_URL}/api/media/fetch-user-media/${userId}`,
  );

  console.log(res.data);

  return res.data;
};
