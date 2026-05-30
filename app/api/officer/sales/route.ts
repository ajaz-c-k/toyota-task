import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Car from "@/models/Car";
import IncentiveSlab from "@/models/IncentiveSlab";
import SalesRecord from "@/models/SalesRecord";
import { checkSales } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const salesUser = await checkSales();
    if (!salesUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "A valid month parameter (YYYY-MM) is required." }, { status: 400 });
    }

    // Dynamic current month determination based on server time
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await connectDB();

    // Fetch active inventory and slabs
    const [cars, slabs] = await Promise.all([
      Car.find({}).sort({ modelName: 1 }),
      IncentiveSlab.find({}).sort({ minCars: 1 }),
    ]);

    // Fetch existing monthly sales record
    const record = await SalesRecord.findOne({
      officerId: salesUser.id,
      month,
    });

    // Fetch all historical monthly records for this officer
    const history = await SalesRecord.find({
      officerId: salesUser.id,
    }).sort({ month: -1 });

    return NextResponse.json({
      success: true,
      cars,
      slabs,
      currentMonth,
      record: record || null,
      history,
    });
  } catch (error: any) {
    console.error("GET Sales API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const salesUser = await checkSales();
    if (!salesUser) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    await connectDB();
    const { month, sales, submit } = await request.json();

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
    }

    // Rule check: Only the current month can be edited
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (month !== currentMonth) {
      return NextResponse.json({ error: "Only the current month can be edited." }, { status: 400 });
    }

    if (!Array.isArray(sales)) {
      return NextResponse.json({ error: "Sales must be a valid array." }, { status: 400 });
    }

    // Lock check: check if already submitted
    const existingRecord = await SalesRecord.findOne({
      officerId: salesUser.id,
      month,
    });

    if (existingRecord && existingRecord.status === "submitted") {
      return NextResponse.json({ error: "This month is locked and cannot be modified." }, { status: 400 });
    }

    // Validate quantities and build clean array
    let totalCars = 0;
    const formattedSales = [];

    for (const item of sales) {
      const quantity = Math.floor(Number(item.quantity));
      if (isNaN(quantity) || quantity < 0) {
        return NextResponse.json({ error: "Quantities must be positive integers." }, { status: 400 });
      }

      formattedSales.push({
        carId: item.carId,
        quantity,
      });

      totalCars += quantity;
    }

    // Dynamic Payout Calculation
    const slabs = await IncentiveSlab.find({}).sort({ minCars: 1 });
    let qualifiedSlab = null;
    let rate = 0;

    for (const slab of slabs) {
      const isAboveMin = totalCars >= slab.minCars;
      const isBelowMax = slab.maxCars === null || totalCars <= slab.maxCars;

      if (isAboveMin && isBelowMax) {
        qualifiedSlab = slab;
        rate = slab.incentivePerCar;
        break;
      }
    }

    const totalIncentive = totalCars * rate;
    const isSubmitting = submit === true;

    // Save or update the record
    const recordUpdate: any = {
      sales: formattedSales,
      totalCars,
      totalIncentive,
      qualifiedSlabId: qualifiedSlab ? qualifiedSlab._id : null,
      status: isSubmitting ? "submitted" : "draft",
    };

    // If submitting, freeze the qualified slab details at this timestamp
    if (isSubmitting) {
      recordUpdate.qualifiedSlabRateAtSubmission = rate;
      recordUpdate.qualifiedSlabRangeAtSubmission = qualifiedSlab
        ? `${qualifiedSlab.minCars}${qualifiedSlab.maxCars === null ? "+" : `–${qualifiedSlab.maxCars}`}`
        : "None";
    }

    const updatedRecord = await SalesRecord.findOneAndUpdate(
      { officerId: salesUser.id, month },
      recordUpdate,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      record: updatedRecord,
      breakdown: {
        totalCars,
        qualifiedSlab: qualifiedSlab ? `${qualifiedSlab.minCars}-${qualifiedSlab.maxCars === null ? "+" : qualifiedSlab.maxCars}` : "None",
        rate,
        totalIncentive,
      },
    });
  } catch (error: any) {
    console.error("POST Sales API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
