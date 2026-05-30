import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { signJWT } from "@/lib/auth";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-toyota-incentive-calculator-key-2026";

export async function POST(request: Request) {
  try {
    await connectDB();
    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required fields." },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check role restriction
    if (user.role !== role) {
      return NextResponse.json(
        { error: "Unauthorized access: incorrect portal role." },
        { status: 401 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Create session payload
    const payload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Sign JWT using the Web Crypto utility
    const token = await signJWT(payload, JWT_SECRET);

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set HTTP-only Cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 Day
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
