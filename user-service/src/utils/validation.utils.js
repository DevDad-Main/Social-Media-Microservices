import joi from "joi";

//#region Register User Validation
export const validateRegistration = (data) => {
  const schema = joi.object({
    username: joi.string().min(3).max(50).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).max(14).required(),
  });

  return schema.validate(data);
};
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
