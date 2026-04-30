import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  try {
    const res = await fetch("https://ai.hackclub.com/proxy/v1/models", {
      headers: { Authorization: authHeader },
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch models" }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
