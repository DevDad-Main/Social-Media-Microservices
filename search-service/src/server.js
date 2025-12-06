import "dotenv/config";
import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";
import {
  consumeEvent as consumeRabbitMQEvent,
  initializeRabbitMQ,
} from "./utils/rabbitmq.utils.js";
import { handlePostCreated } from "./eventHandlers/search.eventHandler.js";

await connectDB();

(async () => {
  try {
    await initializeRabbitMQ();

    await consumeRabbitMQEvent("post.created", handlePostCreated);

    app.listen(process.env.PORT || 3004, () => {
      logger.info(
        `Search Service is running on port ${process.env.PORT || 3004}`,
      );
      logger.info("Search Service DB Status ->", getDBStatus());
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
