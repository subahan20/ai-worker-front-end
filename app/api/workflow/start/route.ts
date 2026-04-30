import { NextRequest, NextResponse } from "next/server";
import { startDepartment } from "@/src/server/mock-workflow-store";
import type { Department } from "@/src/types/agent";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    requestId?: string;
    department?: Department;
  };

  if (!body.requestId || !body.department) {
    return NextResponse.json(
      { error: "requestId and department are required" },
      { status: 400 }
    );
  }

  const result = startDepartment(body.requestId, body.department);

  if (!result) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
