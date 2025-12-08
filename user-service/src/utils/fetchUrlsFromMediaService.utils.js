import axios from "axios";
import { AppError } from "devdad-express-utils";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

export const fetchMediaByUserId = async (userId) => {
  if (!userId || typeof userId !== "string") {
    throw new AppError("User Id is not valid", 400);
  }
  console.log("MEDIA SERVICE URL", MEDIA_SERVICE_URL);
  const res = await axios.get(
    `http://localhost:3000/v1/media/fetch-user-media/${userId}`,
    // `${MEDIA_SERVICE_URL}/v1/media/fetch-user-media/${userId}`,
  );
  console.log("RESPONSE DATA", res);
  return res.data.media;
};
