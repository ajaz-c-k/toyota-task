import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SalesRecord from "@/models/SalesRecord";
import { checkAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "A valid month parameter (YYYY-MM) is required." }, { status: 400 });
    }

    await connectDB();

    // 1. Fetch all Sales Officers
    const officers = await User.find({ role: "sales" }).select("-passwordHash").sort({ name: 1 });

    // 2. Fetch all sales records for the requested month
    const records = await SalesRecord.find({ month }).populate("qualifiedSlabId");

    // 3. Map records to officers
    let totalCarsSold = 0;
    let totalPayrollPayout = 0;
    let lockedSubmissions = 0;

    const payrollList = officers.map((officer) => {
      const record = records.find((r) => r.officerId.toString() === officer._id.toString());
      
      let carsSold = 0;
      let payout = 0;
      let status = "No Log";
      let slabRange = "None";

      if (record) {
        carsSold = record.totalCars;
        payout = record.totalIncentive;
        status = record.status === "submitted" ? "Locked" : "Draft";
        
        if (record.status === "submitted") {
          slabRange = record.qualifiedSlabRangeAtSubmission || "None";
          lockedSubmissions++;
        } else if (record.qualifiedSlabId) {
          // If draft, display range from populated slab
          const slab: any = record.qualifiedSlabId;
          slabRange = `${slab.minCars}${slab.maxCars === null ? "+" : `–${slab.maxCars}`}`;
        }
        
        totalCarsSold += carsSold;
        totalPayrollPayout += payout;
      }

      return {
        officerId: officer._id,
        name: officer.name,
        email: officer.email,
        carsSold,
        payout,
        status,
        slabRange,
      };
    });

    return NextResponse.json({
      success: true,
      month,
      metrics: {
        totalCarsSold,
        totalPayrollPayout,
        totalOfficers: officers.length,
        lockedSubmissions,
        reportingRate: officers.length > 0 ? Math.round((records.length / officers.length) * 100) : 0,
      },
      payroll: payrollList,
    });
  } catch (error: any) {
    console.error("GET Admin Payroll API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
