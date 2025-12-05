import { v2 as cloudinary } from "cloudinary";
import { AppError, logger } from "devdad-express-utils";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//#region Upload File To Cloudinary
/**
 * Uploads the specified file using Buffers and Streams.
 * @param {Int32Array} buffer
 * @param {string} resourceType - Defaults to "image" but can be "video"
 * @returns Promise -> If we successfully manage to pipe our stream with our buffered data file to Cloudinary
 */
export const uploadMediaBufferToCloudinary = async (
  buffer,
  resourceType = "image",
) => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new AppError("Missing buffer data"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `SocialMediaMicroservice`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (result) {
          logger.info("Successfully uploaded file to Cloudinary: ", result);
          resolve(result);
        } else {
          logger.error("Error while uploading file to Cloudinary: ", error);
          reject(error);
        }
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};
//#endregion

//#region Get Public ID from URL
/**
 * Gets the public ID from the specified URL
 * @param {string} url
 * @returns {string} publicId - The publicId of the uploaded file.
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary"))
    throw new Error("Invalid URL");

  const parts = url.split("/");
  const fileWithExtension = parts.pop(); // 'filename.jpg'
  const folder = parts.slice(-2).join("/"); // 'LearnHub/folderId'
  const publicId = `${folder}/${fileWithExtension.split(".")[0]}`;
  return publicId;
};
//#endregion

//#region Delete Image From Cloudinary
/**
 *
 * @param {string} publicId
 * @param {string} resourceType
 * @returns Promise on whether we have deleted the file or not
 */
export const deleteImageFromCloudinary = async (
  publicId,
  resourceType = "image",
) => {
  try {
    if (!publicId || typeof publicId !== "string")
      throw new Error("Invalid publicId");
    //NOTE: Sanity check to see if we are getting the correct response from Cloudinary tests;
    // return "oops";
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    logger.error("Error deleting image from Cloudinary: ", error);
  }
};
//#endregion

//#region Delete Course Folder And It's Contents
/**
 * Deletes all files recursively from the specificed folderId and then cleans up by deleting the Folder
 * @param {string} folderId
 * @returns Promise -> Resolves after we delete all file contents and then deletes the course folder or rejects if we have an issue doing so
 */
export const deleteCourseFolderFromCloudinary = async (folderId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const prefix = `LearnHub/${folderId}`;

      // Delete images in the folder
      await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: "image",
      });

      // Delete videos in the folder
      await cloudinary.api.delete_resources_by_prefix(prefix, {
        resource_type: "video",
      });

      // Finally, delete the folder itself
      const result = await cloudinary.api.delete_folder(prefix);

      resolve(result);
    } catch (error) {
      console.error("Error deleting folder from Cloudinary:", error);
      reject(error);
    }
  });
};
//#endregion
