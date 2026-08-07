import { NextRequest, NextResponse } from "next/server";
import { createGroup, listGroups } from "@/lib/db/local-db";
import { handleApiError } from "@/lib/api/respond";
import { groupCreateSchema } from "@/lib/api/schemas";

export async function GET() {
  try {
    return NextResponse.json(listGroups());
  } catch (error) {
    return handleApiError(error, "Failed to fetch discipline groups");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = groupCreateSchema.parse(await req.json());
    return NextResponse.json(createGroup(body), { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create discipline group");
  }
}
