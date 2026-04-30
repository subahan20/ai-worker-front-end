import { NextResponse } from "next/server";
import { approveWorkflow } from "@/src/server/mock-workflow-store";

type Context = {
  params: Promise<{ requestId: string }>;
};

export async function POST(_: Request, context: Context) {
  const { requestId } = await context.params;
  const result = approveWorkflow(requestId);

  if (!result) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
