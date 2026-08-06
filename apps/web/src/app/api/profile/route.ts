import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { profilePatchSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    return NextResponse.json(getProfile());
  } catch (error) {
    return handleApiError(error, "Failed to fetch profile");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = profilePatchSchema.parse(await req.json());
    return NextResponse.json(updateProfile(body));
  } catch (error) {
    return handleApiError(error, "Failed to update profile");
  }
}
