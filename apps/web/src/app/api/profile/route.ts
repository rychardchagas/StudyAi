import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/db/local-db";

export async function GET() {
  try {
    return NextResponse.json(getProfile());
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json(updateProfile(body));
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
