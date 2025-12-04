import joi from "joi";

export const validateNewPostCreation = (data) => {
  const schema = joi.object({
    content: joi.string().min(5).max(180).required(),
    imageUrls: joi.array().max(4),
    postType: joi.string().required(),
  });

  return schema.validate(data);
};
