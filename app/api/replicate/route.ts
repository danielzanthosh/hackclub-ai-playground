import { NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
  }

  const apiKey = authHeader.replace("Bearer ", "");
  
  try {
    const body = await request.json();
    const { model, input } = body;
    
    if (!model || !input) {
      return NextResponse.json({ error: "Missing model or input" }, { status: 400 });
    }

    // Pass the HC AI key directly to Replicate since HC AI proxies it
    const replicate = new Replicate({ auth: apiKey });
    
    const output = await replicate.run(model as any, { input });
    
    return NextResponse.json({ output });
  } catch (error: any) {
    console.error("Replicate API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to run model" }, { status: 500 });
  }
}
