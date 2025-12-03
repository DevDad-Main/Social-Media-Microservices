import { connectDB, getDBStatus, logger } from "devdad-express-utils";
import { app } from "./app.js";

await connectDB();

const dbStatus = getDBStatus();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
  logger.info("DB Status", dbStatus);
});
