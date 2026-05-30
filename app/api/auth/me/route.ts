import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-toyota-incentive-calculator-key-2026";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    const payload = await verifyJWT(token, JWT_SECRET);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    await connectDB();
    const dbUser = await User.findById(payload.id).select("-passwordHash");
    if (!dbUser) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser._id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
    });
  } catch (error) {
    console.error("Auth Me API Error:", error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
