import mongoose from "mongoose";

import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI or MONGO_URI in the environment");
  }

  console.log("DNS:", dns.getServers());

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
};

export default connectDB;
