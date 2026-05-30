import mongoose, { Schema, Document } from "mongoose";

export interface IIncentiveSlab extends Document {
  minCars: number;
  maxCars: number | null; // null represents 'Unlimited'
  incentivePerCar: number;
  createdAt: Date;
}

const IncentiveSlabSchema = new Schema<IIncentiveSlab>(
  {
    minCars: { type: Number, required: true },
    maxCars: { type: Number, default: null }, // Null stands for Unlimited
    incentivePerCar: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.IncentiveSlab || mongoose.model<IIncentiveSlab>("IncentiveSlab", IncentiveSlabSchema);
