import mongoose, { Schema, Document } from "mongoose";

export interface ISalesItem {
  carId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ISalesRecord extends Document {
  officerId: mongoose.Types.ObjectId;
  month: string; // Format: "YYYY-MM"
  sales: ISalesItem[];
  totalCars: number;
  totalIncentive: number;
  qualifiedSlabId: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SalesItemSchema = new Schema<ISalesItem>({
  carId: { type: Schema.Types.ObjectId, ref: "Car", required: true },
  quantity: { type: Number, required: true, min: 0 },
});

const SalesRecordSchema = new Schema<ISalesRecord>(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true }, // "YYYY-MM"
    sales: [SalesItemSchema],
    totalCars: { type: Number, required: true, default: 0 },
    totalIncentive: { type: Number, required: true, default: 0 },
    qualifiedSlabId: { type: Schema.Types.ObjectId, ref: "IncentiveSlab", default: null },
  },
  { timestamps: true }
);

// Compound index to ensure one sales record per officer per month
SalesRecordSchema.index({ officerId: 1, month: 1 }, { unique: true });

export default mongoose.models.SalesRecord || mongoose.model<ISalesRecord>("SalesRecord", SalesRecordSchema);
