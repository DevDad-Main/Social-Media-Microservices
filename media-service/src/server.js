import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";

await connectDB();

app.listen(process.env.PORT || 3003, () => {
  logger.info(`Media Service is running on port ${process.env.PORT || 3003}`);
  logger.info("Media Service DB Status ->", getDBStatus());
});

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
