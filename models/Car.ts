import mongoose, { Schema, Document } from "mongoose";

export interface ICar extends Document {
  modelName: string;
  baseSuffix: string;
  variant: string;
  createdAt: Date;
}

const CarSchema = new Schema<ICar>(
  {
    modelName: { type: String, required: true },
    baseSuffix: { type: String, required: true },
    variant: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Car || mongoose.model<ICar>("Car", CarSchema);
