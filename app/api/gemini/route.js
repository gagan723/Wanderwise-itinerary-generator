import { askGemini } from "@/lib/gemini";

export async function POST(req) {
  try {
    const { userMessage, type, context } = await req.json();
    const reply = await askGemini({ userMessage, type, context });
    return Response.json({ reply });
  } catch (error) {
    return new Response("Gemini API error", { status: 500 });
  }
}
