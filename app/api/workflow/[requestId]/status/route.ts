import { NextResponse } from "next/server";
import { getWorkflowStatus } from "@/src/server/mock-workflow-store";

type Context = {
  params: Promise<{ requestId: string }>;
};

export async function GET(_: Request, context: Context) {
  const { requestId } = await context.params;
  const result = getWorkflowStatus(requestId);

  if (!result) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
