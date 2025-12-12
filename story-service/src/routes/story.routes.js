import { Router } from "express";
import { addStory } from "../controllers/story.controller.js";
import { addStoryValidation } from "../utils/validation.utils.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { upload } from "../utils/multer.utils.js";

const storyRouter = Router();

storyRouter.use(authenticateUserMiddleware);

storyRouter.post("/add-story", upload.single("media"), addStory);

export default storyRouter;
