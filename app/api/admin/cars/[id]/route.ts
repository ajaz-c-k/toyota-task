import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Car from "@/models/Car";
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
    const { modelName, baseSuffix, variant } = await request.json();

    if (!modelName || !baseSuffix || !variant) {
      return NextResponse.json(
        { error: "Model Name, Base Suffix, and Variant are required." },
        { status: 400 }
      );
    }

    await connectDB();
    const updatedCar = await Car.findByIdAndUpdate(
      id,
      {
        modelName: modelName.trim(),
        baseSuffix: baseSuffix.trim(),
        variant: variant.trim(),
      },
      { new: true }
    );

    if (!updatedCar) {
      return NextResponse.json({ error: "Vehicle model not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, car: updatedCar });
  } catch (error: any) {
    console.error("PUT Car API Error:", error);
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
    const deletedCar = await Car.findByIdAndDelete(id);

    if (!deletedCar) {
      return NextResponse.json({ error: "Vehicle model not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Vehicle model deleted successfully." });
  } catch (error: any) {
    console.error("DELETE Car API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
