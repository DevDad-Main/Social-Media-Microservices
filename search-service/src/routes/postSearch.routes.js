import { Router } from "express";
import { postSearch } from "../controllers/postSearch.controller";
import { authenticateUserMiddleware } from "../middleware/auth.middleware";

const postSearchRouter = Router();

postSearchRouter.use(authenticateUserMiddleware);
postSearchRouter.get("/posts", postSearch);

export default postSearchRouter;
