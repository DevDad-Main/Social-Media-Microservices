import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";
import { initializeRabbitMQ } from "./utils/rabbitmq.utils.js";

await connectDB();

(async () => {
  try {
    await initializeRabbitMQ();

    app.listen(process.env.PORT || 3006, () => {
      logger.info(
        `Comment Service is running on port ${process.env.PORT || 3006}`,
      );
      logger.info("Comment Service DB Status ->", getDBStatus());
    });
  } catch (error) {
    logger.error("Failed to connect to servers... ", { error });
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
