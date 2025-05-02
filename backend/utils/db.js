import mongoose from "mongoose";
import colors from "colors";

const connectDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(colors.bgGreen(`Mongo Connected: ${conn.connection.host}`));
  } catch (error) {
    console.log(colors.bgRed(`Error: ${error.message}`));
    process.exit(1);
  }
};

export default connectDb;