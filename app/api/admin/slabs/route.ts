import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import IncentiveSlab from "@/models/IncentiveSlab";
import { checkAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    await connectDB();
    const slabs = await IncentiveSlab.find({}).sort({ minCars: 1 });
    return NextResponse.json({ success: true, slabs });
  } catch (error: any) {
    console.error("GET Slabs API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    await connectDB();
    const { minCars, maxCars, incentivePerCar } = await request.json();

    const min = Number(minCars);
    const max = maxCars === null || maxCars === "" ? null : Number(maxCars);
    const incentive = Number(incentivePerCar);

    // Validation checks
    if (isNaN(min) || min < 0) {
      return NextResponse.json({ error: "Minimum cars must be a positive integer." }, { status: 400 });
    }
    if (max !== null && (isNaN(max) || max < min)) {
      return NextResponse.json({ error: "Maximum cars must be greater than or equal to minimum." }, { status: 400 });
    }
    if (isNaN(incentive) || incentive < 0) {
      return NextResponse.json({ error: "Incentive rate per car must be a positive integer." }, { status: 400 });
    }

    // Overlap checks
    const existingSlabs = await IncentiveSlab.find({});
    const newMaxVal = max === null ? Infinity : max;

    for (const slab of existingSlabs) {
      const slabMaxVal = slab.maxCars === null ? Infinity : slab.maxCars;
      // Intersection check: minA <= maxB && minB <= maxA
      if (min <= slabMaxVal && slab.minCars <= newMaxVal) {
        return NextResponse.json(
          {
            error: `Range overlap detected: Slab [${min}-${max === null ? "Unlimited" : max}] overlaps with existing slab [${slab.minCars}-${slab.maxCars === null ? "Unlimited" : slab.maxCars}].`,
          },
          { status: 400 }
        );
      }
    }

    const newSlab = await IncentiveSlab.create({
      minCars: min,
      maxCars: max,
      incentivePerCar: incentive,
    });

    return NextResponse.json({ success: true, slab: newSlab }, { status: 201 });
  } catch (error: any) {
    console.error("POST Slab API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
