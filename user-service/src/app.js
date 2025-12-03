import express from "express";
import "dotenv/config";
import { errorHandler } from "devdad-express-utils";
import userRouter from "./routes/user.routes.js";
import helmet from "helmet";

//#region Constants
const app = express();
//#endregion

//#region Middleware
app.use(helmet());
//TODO: Add CORS custom configuration
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
//#endregion

//#region Route Entry Points
app.use("/api/v1/user", userRouter);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
