import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Car from "@/models/Car";
import IncentiveSlab from "@/models/IncentiveSlab";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/toyota-incentive";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global caching pattern for serverless / Next.js environments
let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  // Auto-seed database if User collection is empty
  await seedDB();

  return cached.conn;
}

async function seedDB() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding Database: Creating default users, cars, and slabs...");

      // Seed Users
      const salt = await bcrypt.genSalt(10);
      const adminPasswordHash = await bcrypt.hash("admin123", salt);
      const salesPasswordHash = await bcrypt.hash("officer123", salt);

      await User.create([
        {
          name: "Toyota Admin",
          email: "admin@toyota.com",
          passwordHash: adminPasswordHash,
          role: "admin",
        },
        {
          name: "Sales Officer",
          email: "officer@toyota.com",
          passwordHash: salesPasswordHash,
          role: "sales",
        },
      ]);
      console.log("Seeding complete: Created admin@toyota.com (admin) and officer@toyota.com (sales).");

      // Seed Cars
      const carCount = await Car.countDocuments();
      if (carCount === 0) {
        await Car.create([
          { modelName: "Toyota Camry", baseSuffix: "SE", variant: "Gas" },
          { modelName: "Toyota Corolla", baseSuffix: "LE", variant: "Hybrid" },
          { modelName: "Toyota RAV4", baseSuffix: "XLE", variant: "Hybrid" },
          { modelName: "Toyota Tacoma", baseSuffix: "TRD Sport", variant: "Gas 4WD" },
        ]);
        console.log("Seeding complete: Created default cars.");
      }

      // Seed Slabs
      const slabCount = await IncentiveSlab.countDocuments();
      if (slabCount === 0) {
        await IncentiveSlab.create([
          { minCars: 1, maxCars: 3, incentivePerCar: 1000 },
          { minCars: 4, maxCars: 7, incentivePerCar: 2000 },
          { minCars: 8, maxCars: null, incentivePerCar: 3500 },
        ]);
        console.log("Seeding complete: Created default slabs.");
      }
    }
  } catch (error) {
    console.error("Database Seeding Failed:", error);
  }
}
