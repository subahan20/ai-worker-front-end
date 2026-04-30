import { NextRequest, NextResponse } from "next/server";
import { createWorkflow } from "@/src/server/mock-workflow-store";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { goal?: string };
  const goal = body.goal?.trim();

  if (!goal) {
    return NextResponse.json({ error: "Goal is required" }, { status: 400 });
  }

  const result = createWorkflow(goal);
  return NextResponse.json(result, { status: 201 });
}
