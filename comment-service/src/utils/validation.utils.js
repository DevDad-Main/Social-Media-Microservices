import { body } from "express-validator";
import { validateContent, validateId } from "./safeRegex.utils.js";

//#region New Comment Validation
export const createCommentValidation = [
  body("content")
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters")
    .trim()
    .custom(validateContent),
];
//#endregion

//#region Update Comment Valdiation
export const updateCommentValidation = [
  body("content")
    .notEmpty()
    .withMessage("Comment content is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters")
    .trim()
    .custom(validateContent),

  body("commentId")
    .notEmpty()
    .withMessage("Comment ID is required")
    .trim()
    .custom(validateId)
];
//#endregion
