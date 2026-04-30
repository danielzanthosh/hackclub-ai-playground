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
    
    // Check if the model is a chat/text model that should stream
    // For now, we'll support streaming if requested in the body or by default for certain models
    const shouldStream = body.stream !== false;

    if (shouldStream) {
      try {
        const stream = await replicate.stream(model as any, { input });
        
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const event of stream) {
                controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
              }
              controller.enqueue("data: [DONE]\n\n");
            } catch (err) {
              console.error("Stream iteration error:", err);
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      } catch (streamError) {
        console.warn("Streaming not supported or failed for this model, falling back to regular run.", streamError);
      }
    }

    const output = await replicate.run(model as any, { input });
    return NextResponse.json({ output });
  } catch (error: any) {
    console.error("Replicate API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to run model" }, { status: 500 });
  }
}
