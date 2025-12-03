import "dotenv/config";
import { app } from "./app.js";
import { logger } from "devdad-express-utils";

app.listen(process.env.PORT || 3000, () => {
  logger.info(`API-Entrypoint is running on port ${process.env.PORT || 3000}`);
  logger.info(
    `User-Service is running on port ${process.env.USER_SERVICE_URL || 3001}`,
  );
  logger.info("Redis is running on ->", { redisUrl: process.env.REDIS_URL });
});
