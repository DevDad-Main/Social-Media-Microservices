import { AppError } from "devdad-express-utils";
import { User } from "../models/User.model.js";
import { body } from "express-validator";

//#region Register User Validation
export const registerUserValidation = [
  body("firstName").notEmpty().withMessage("First name is required.").trim(),

  body("lastName").notEmpty().withMessage("Last name is required.").trim(),

  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .trim()
    .bail()
    .isLength({ min: 5, max: 12 })
    .withMessage("Username must be between 5 and 12 characters.")
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
export const validateLogin = (data) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).max(14).required(),
  });

  return schema.validate(data);
};
//#endregion
