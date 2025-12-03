import express from "express";
import { errorHandler } from "devdad-express-utils";

//#region Constants
const app = express();
//#endregion

//#region Middleware

//#endregion

//#region Route Entry Points

//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
