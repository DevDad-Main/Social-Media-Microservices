import { Router } from "express";
import { postSearch } from "../controllers/postSearch.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";

const postSearchRouter = Router();

postSearchRouter.use(authenticateUserMiddleware);
postSearchRouter.get("/posts", postSearch);

export default postSearchRouter;
