import "dotenv/config";
import { app } from "./app.js";
import { logger } from "devdad-express-utils";

app.listen(process.env.PORT || 3000, () => {
  logger.info(`API-Entrypoint is running on port ${process.env.PORT || 3000}`);
  logger.info(
    `USER-Service is running on port ${process.env.USER_SERVICE_URL || 3001}`,
  );
  logger.info(
    `POST-Service is running on port ${process.env.POST_SERVICE_URL || 3002}`,
  );
  logger.info(
    `MEDIA-Service is running on port ${process.env.MEDIA_SERVICE_URL || 3003}`,
  );

  logger.info(
    `COMMENT-Service is running on port ${process.env.COMMENT_SERVICE_URL || 3006}`,
  );
  logger.info(
    `NOTIFICATION-Service is running on port ${process.env.NOTIFICATION_SERVICE_URL || 3007}`,
  );
  logger.info("Redis is running on ->", { redisUrl: process.env.REDIS_URL });
});
