import { AppError } from "devdad-express-utils";
import { User } from "../models/User.model.js";
import { body, query } from "express-validator";
import {
  validateUsername,
  validateName,
  validatePassword,
  validateSearchQuery,
} from "./safeRegex.utils.js";

//#region Register User Validation
export const registerUserValidation = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required.")
    .trim()
    .custom(validateName),

  body("lastName")
    .notEmpty()
    .withMessage("Last name is required.")
    .trim()
    .custom(validateName),

  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .bail()
    .isLength({ min: 5, max: 12 })
    .withMessage("Username must be between 5 and 12 characters.")
    .custom(validateUsername)
    .custom(async (value) => {
      const user = await User.findOne({ username: value });
      if (user) {
        throw new AppError(
          "Username already exists, Please choose another.",
          400,
        );
      }
    }),
  body("email")
    .notEmpty()
    .withMessage("Email is required.")
    .bail()
    .isEmail()
    .withMessage("Please enter a valid email address.")
    .custom(async (value) => {
      const user = await User.findOne({ email: value });
      if (user) {
        throw new Error("Email address already in use, Please choose another.");
      }
    })
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .custom(validatePassword)
    .isStrongPassword({
      minLength: 6,
      maxLength: 12,
      minUppercase: 1,
      minNumbers: 3,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be 6–12 characters and include at least 1 uppercase, 3 numbers, and 1 symbol.",
    )
    .trim(),
];
//#endregion

//#region Login User Validation
export const loginUserValidation = [
  body("username")
    .notEmpty()
    .withMessage("Username can't be empty!")
    .bail()
    .custom(async (value) => {
      const userToFind = await User.findOne({ username: value });
      if (!userToFind) {
        throw new Error("User Not Found!");
      }
    })
    .trim(),
  body("password").notEmpty().withMessage("Password can't be empty!"),
];
//#endregion

//#region Update User Details Validation
export const updateUserValidation = [
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required and cannot be empty!")
    .trim()
    .custom(validateName),
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .bail()
    .isLength({ min: 5, max: 12 })
    .withMessage("Username must be between 5 and 12 characters.")
    .custom(validateUsername)
    .custom(async (value, { req }) => {
      const loggedInUser = await User.findById(req.user?._id);
      if (loggedInUser.username === value) {
        return new AppError(
          "Username already exists, Please choose another.",
          400,
        );
      }
      const user = await User.findOne({ username: value });
      if (user) {
        return new AppError(
          "Username already exists, Please choose another.",
          400,
        );
      }
    }),
];
//#endregion

//#region User search Validation
export const usersSearchValidation = [
  query("query")
    .notEmpty()
    .withMessage("Search Query is required!")
    .trim()
    .custom(validateSearchQuery),
];
//#endregion
