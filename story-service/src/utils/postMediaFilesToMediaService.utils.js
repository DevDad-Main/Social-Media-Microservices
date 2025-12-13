import axios from "axios";
import FormData from "form-data";
import { AppError, logger } from "devdad-express-utils";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

//#region Post Media Files to Media Service
export const postMediaFileToMediaServiceForProcessing = async (
  storyId,
  file,
  userId,
) => {
  if (!storyId || typeof storyId !== "string") {
    logger.warn("Story Id is not valid");
    throw new AppError("Story Id is not valid", 400);
  }

  if (!file) {
    logger.warn("No file provided", { file });
    throw new AppError("No file provided", 400);
  }

  logger.info("FILE from processsing function", file);

  const formData = new FormData();

  formData.append("storyId", storyId);
  formData.append("userId", userId);
  formData.append("image", file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  logger.info("FORMDATA", formData);

  const res = await axios.post(
    `${MEDIA_SERVICE_URL}/api/media/story-media-file`,
    formData,
    {
      headers: {
        ...formData.getHeaders(),
      },
    },
  );

  console.log(res.data);

  return res.data;
};
//#endregion
