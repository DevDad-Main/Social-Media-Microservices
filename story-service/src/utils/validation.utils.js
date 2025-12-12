import { body } from "express-validator";

//#region Add Story Validation
export const addStoryValidation = [
  body("content").notEmpty().withMessage("Please enter some text!"),
];
//#endregion
