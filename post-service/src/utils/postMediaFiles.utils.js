import axios from "axios";
import FormData from "form-data";
import { AppError, logger } from "devdad-express-utils";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

export const postMediaFilesToMediaServiceForProcessing = async (
  postId,
  files,
) => {
  if (!postId || typeof postId !== "string") {
    logger.warn("Post Id is not valid");
    throw new AppError("Post Id is not valid", 400);
  }

  if (files.length === 0) {
    logger.warn("No files provided", { files });
    throw new AppError("No files provided", 400);
  }

  logger.info("FILES from processsing function", files);

  const formData = new FormData();
  formData.append("postId", postId);

  files.forEach((file, index) => {
    formData.append("images", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  });

  logger.info("FORMDATA", formData);

  const res = await axios.post(
    `${MEDIA_SERVICE_URL}/api/media/post-media-files`,
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
