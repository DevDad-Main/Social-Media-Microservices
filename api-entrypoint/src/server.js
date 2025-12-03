import "dotenv/config";
import { app } from "./app.js";

app.listen(process.env.PORT || 3001, () => {
  logger.info(`Server is running on port ${process.env.PORT || 3001}`);
  logger.info("DB Status", getDBStatus());
});
