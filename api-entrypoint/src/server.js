import "dotenv/config";
import { app } from "./app.js";

app.listen(process.env.PORT || 3000, () => {
  logger.info(`API-Entrypoint is running on port ${process.env.PORT || 3000}`);
});
