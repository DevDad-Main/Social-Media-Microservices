import { body } from "express-validator";

export const validateNewPostCreation = [
  body("content")
    .isLength({ min: 5, max: 180 })
    .withMessage("Content must be between 5 and 180 characters")
    .trim()
    .escape(),

  body("mediaIds")
    .optional()
    .isArray({ max: 4 })
    .withMessage("Media IDs must be an array with maximum 4 items"),

  body("postType")
    .isIn(["text", "image", "text_with_image"])
    .withMessage("Post type must be one of: text, image, text_with_image")
    .trim()
    .escape(),
];
