import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesRecord from "@/models/SalesRecord";
import User from "@/models/User";
import { checkAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    await connectDB();

    // Fetch all sales records, populated with officer details
    const records = await SalesRecord.find({})
      .populate("officerId", "name email")
      .sort({ month: -1, updatedAt: -1 });

    const formattedHistory = records.map((record: any) => {
      // Handle edge cases where user might have been deleted or doesn't resolve
      const officerName = record.officerId?.name || "Unknown Officer";
      const officerEmail = record.officerId?.email || "unknown@toyota.com";

      let slabRange = "None";
      if (record.status === "submitted") {
        slabRange = record.qualifiedSlabRangeAtSubmission || "None";
      } else {
        // We'll approximate range based on the rate or simple mapping
        slabRange = "Draft (Unfinalized)";
      }

      return {
        _id: record._id,
        officerId: record.officerId?._id || null,
        name: officerName,
        email: officerEmail,
        month: record.month,
        totalCars: record.totalCars,
        totalIncentive: record.totalIncentive,
        status: record.status,
        slabRange,
        updatedAt: record.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      history: formattedHistory,
    });
  } catch (error: any) {
    console.error("GET Admin Users History API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
