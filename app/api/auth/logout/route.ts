import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ success: true, message: "Logged out successfully" });
    
    // Delete cookie by setting maxAge to 0
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
