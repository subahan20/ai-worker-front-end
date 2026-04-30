import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = "https://ai-worker-backend-ztos.onrender.com";

type Context = {
  params: Promise<{
    path: string[];
  }>;
};

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const query = request.nextUrl.search;
  const targetUrl = `${BACKEND_BASE_URL}/${targetPath}${query}`;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  try {
    const backendResponse = await fetch(targetUrl, init);
    const body = await backendResponse.text();

    return new NextResponse(body, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach backend service" },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: Context) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: Context) {
  return proxy(request, context);
}
