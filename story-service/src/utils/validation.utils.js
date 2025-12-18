import { body } from "express-validator";
import { validateContent, validateId } from "./safeRegex.utils.js";

//#region Add Story Validation
export const addStoryValidation = [
  body("content")
    .notEmpty()
    .withMessage("Story content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Story must be between 1 and 500 characters")
    .trim()
    .custom(validateContent),
];

export const updateStoryValidation = [
  body("content")
    .notEmpty()
    .withMessage("Story content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Story must be between 1 and 500 characters")
    .trim()
    .custom(validateContent),
];
//#endregion
