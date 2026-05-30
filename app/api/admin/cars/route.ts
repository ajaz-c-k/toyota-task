import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Car from "@/models/Car";
import { checkAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    await connectDB();
    const cars = await Car.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, cars });
  } catch (error: any) {
    console.error("GET Cars API Error:", error);
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
    const { modelName, baseSuffix, variant } = await request.json();

    if (!modelName || !baseSuffix || !variant) {
      return NextResponse.json(
        { error: "Model Name, Base Suffix, and Variant are required." },
        { status: 400 }
      );
    }

    const car = await Car.create({
      modelName: modelName.trim(),
      baseSuffix: baseSuffix.trim(),
      variant: variant.trim(),
    });

    return NextResponse.json({ success: true, car }, { status: 201 });
  } catch (error: any) {
    console.error("POST Car API Error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
