import { body } from "express-validator";
import { validateContent, validateId } from "./safeRegex.utils.js";

export const validateNewPostCreation = [
  body("content")
    .isLength({ min: 5, max: 180 })
    .withMessage("Content must be between 5 and 180 characters")
    .trim()
    .custom(validateContent),

  body("mediaIds")
    .optional()
    .isArray({ max: 4 })
    .withMessage("Media IDs must be an array with maximum 4 items")
    .custom((array) => {
      if (array) {
        for (const id of array) {
          if (!validateId(id)) {
            throw new Error('Invalid media ID format');
          }
        }
      }
      return true;
    }),

  body("postType")
    .isIn(["text", "image", "text_with_image"])
    .withMessage("Post type must be one of: text, image, text_with_image")
    .trim()
    .escape(),
];
