import { connectDB, getDBStatus } from "devdad-express-utils";
import { app } from "./app";

await connectDB();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
  console.log(getDBStatus());
});
