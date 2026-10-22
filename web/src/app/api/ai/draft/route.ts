import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logApiUsage } from '@/lib/api-usage';
import { withGeminiFallback, AiBusyError } from '@/lib/gemini';

// Court lookups and AI retries can take longer than the default serverless limit
export const maxDuration = 60;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: Request) {
  try {
    const { messages, documentType } = await req.json();

    if (!messages || !documentType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const makeModel = (m: string) => genAI.getGenerativeModel({
      model: m,
      systemInstruction: `Expert Indian Legal AI for ${documentType}. Draft complete doc per local laws. 
STRICT: Output code-only JSON. No conversational text.
JSON Schema:
{
  "extractedData": {
    "fullDraft": "Complete Markdown legal text with Clauses/Schedules",
    "...": "Dynamic keys for provided data"
  }
}
Omit null/empty fields from JSON to save tokens. Support bilingual names/addresses (English+Regional).`
    });

    const formattedHistory: any[] = [];
    
    // Gemini SDK requires the first message in history to be from 'user'.
    // If our UI's first message was the AI greeting, we unshift a dummy user message.
    if (messages.length > 0 && messages[0].role === 'ai') {
      formattedHistory.push({
        role: 'user',
        parts: [{ text: `Hi, I need your help to draft a formal ${documentType}. Let's begin.` }]
      });
    }

    messages.forEach((m: any) => {
      formattedHistory.push({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }]
      });
    });

    // Start chat with history (excluding the very last actual user message which we send explicitly)
    // Send the latest user message (retries busy models, then falls back to lighter ones)
    const latestUserMessage = messages[messages.length - 1].content;
    const { result, model: modelName } = await withGeminiFallback((m) =>
      makeModel(m).startChat({ history: formattedHistory.slice(0, -1) }).sendMessage(latestUserMessage)
    );
    const responseText = result.response.text();

    // Log Usage (Gemini 2.5/1.5 provides usageMetadata)
    try {
      if (result.response.usageMetadata) {
        await logApiUsage({
          serviceProvider: "Google Gemini",
          modelName,
          endpoint: "/api/ai/draft",
          promptTokens: result.response.usageMetadata.promptTokenCount,
          completionTokens: result.response.usageMetadata.candidatesTokenCount,
          totalTokens: result.response.usageMetadata.totalTokenCount,
          metadata: { documentType }
        });
      }
    } catch (logErr) {
      console.error("[api/ai/draft] Usage logging failed:", logErr);
    }

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('Drafting AI Error:', error);
    
    if (error instanceof AiBusyError) {
      return NextResponse.json({ error: error.message, code: 'AI_BUSY' }, { status: 503 });
    }

    return NextResponse.json(
      { error: 'An error occurred while communicating with the AI. Please try again.' },
      { status: 500 }
    );
  }
}
