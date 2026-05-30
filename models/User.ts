import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "sales";
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["admin", "sales"] },
  },
  { timestamps: true }
);

// Prevent recompilation of model during Next.js hot-reloads
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
