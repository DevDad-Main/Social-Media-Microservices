import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";
import { connectToRabbitMQ } from "./utils/rabbitmq.utils.js";

await connectDB();

(async () => {
  try {
    await connectToRabbitMQ();
    app.listen(process.env.PORT || 3002, () => {
      logger.info(
        `Post Service is running on port ${process.env.PORT || 3002}`,
      );
      logger.info("Post Service DB Status ->", getDBStatus());
    });
  } catch (error) {
    logger.error("Failed to connect to servers... ", error);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled Rejection at: Promise", p, "reason:", reason);
  process.exit(1);
});
