import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import IncentiveSlab from "@/models/IncentiveSlab";
import { checkAdmin } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await params;
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

    await connectDB();

    // Overlap checks (excluding self)
    const existingSlabs = await IncentiveSlab.find({ _id: { $ne: id } });
    const newMaxVal = max === null ? Infinity : max;

    for (const slab of existingSlabs) {
      const slabMaxVal = slab.maxCars === null ? Infinity : slab.maxCars;
      // Intersection check
      if (min <= slabMaxVal && slab.minCars <= newMaxVal) {
        return NextResponse.json(
          {
            error: `Range overlap detected: Slab [${min}-${max === null ? "Unlimited" : max}] overlaps with existing slab [${slab.minCars}-${slab.maxCars === null ? "Unlimited" : slab.maxCars}].`,
          },
          { status: 400 }
        );
      }
    }

    const updatedSlab = await IncentiveSlab.findByIdAndUpdate(
      id,
      {
        minCars: min,
        maxCars: max,
        incentivePerCar: incentive,
      },
      { new: true }
    );

    if (!updatedSlab) {
      return NextResponse.json({ error: "Incentive slab not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, slab: updatedSlab });
  } catch (error: any) {
    console.error("PUT Slab API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();
    const deletedSlab = await IncentiveSlab.findByIdAndDelete(id);

    if (!deletedSlab) {
      return NextResponse.json({ error: "Incentive slab not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Incentive slab deleted successfully." });
  } catch (error: any) {
    console.error("DELETE Slab API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
