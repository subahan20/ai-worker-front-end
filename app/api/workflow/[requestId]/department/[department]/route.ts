import { NextResponse } from "next/server";
import { getDepartmentAutomationDetails } from "@/src/server/mock-workflow-store";
import type { Department } from "@/src/types/agent";

type Context = {
  params: Promise<{ requestId: string; department: string }>;
};

export async function GET(_: Request, context: Context) {
  const { requestId, department } = await context.params;
  const decodedDepartment = decodeURIComponent(department) as Department;

  const result = getDepartmentAutomationDetails(requestId, decodedDepartment);

  if (!result) {
    return NextResponse.json(
      { error: "Workflow or department not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
