import { Router } from "express";
import { postSearch } from "../controllers/postSearch.controller.js";
import { authenticateUserMiddleware } from "../middleware/auth.middleware.js";
import { userSearch } from "../controllers/userSearch.controller.js";

const searchRouter = Router();

searchRouter.use(authenticateUserMiddleware);
searchRouter.get("/posts", postSearch);
searchRouter.get("/discover", userSearch);

export default searchRouter;
