import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { logApiUsage } from '@/lib/api-usage';
import { withGeminiFallback, AiBusyError } from '@/lib/gemini';

// Court lookups and AI retries can take longer than the default serverless limit
export const maxDuration = 60;

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getEmbedding(text: string) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("No Google API key found for embedding generation.");
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values; // Returns the float array of 768 dimensions
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { query, language } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // 1. Convert user query to vector embedding
    let relevantLawsText = "";
    const queryEmbedding = await getEmbedding(query);

    if (queryEmbedding && Array.isArray(queryEmbedding)) {
      // 2. Search Supabase for matching laws
      const { data: matchedLaws, error: searchError } = await supabase.rpc('match_legal_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.3, // Adjust this threshold based on accuracy needs
        match_count: 3        // Get top 3 most relevant laws
      });

      if (!searchError && matchedLaws && matchedLaws.length > 0) {
        relevantLawsText = matchedLaws.map((law: any) => `Title: ${law.title}\nContent: ${law.content}`).join("\n\n---\n\n");
        console.log("Successfully found matching laws from Supabase RAG!");
      } else {
        console.log("No matching laws found or Supabase error:", searchError);
      }
    }

    // 3. Prepare Gemini Prompt with RAG context
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `You are an expert Indian Legal Assistant. 
Analyze the user's query carefully and provide a complete, satisfying answer based on the provided Legal Context.

LEGAL CONTEXT (from Indian Penal Code):
${relevantLawsText || "No specific matching laws found in the database. Rely on your general legal knowledge."}

CRITICAL FORMATTING RULES:
1. DO NOT use paragraphs under any circumstances.
2. Format your entire response exclusively as precise, easy-to-read bullet points.
3. If describing a procedure, use a step-by-step path flow using arrows (e.g., Step 1 -> Step 2 -> Step 3).
4. Always cite the specific Act/Section (e.g., IPC, BNS, Consumer Protection Act) at the top based on the Legal Context provided.
Ensure your response directly addresses the core issue in ${language || 'English'} using markdown. Do not cut off early; ensure the complete answer is provided.`;

    const { result, model: modelName } = await withGeminiFallback((m) =>
      genAI.getGenerativeModel({ model: m }).generateContent(`${systemPrompt}\n\nUser Query: ${query}`)
    );

    // Log tokens for legal rights
    try {
        if (result.response.usageMetadata) {
            await logApiUsage({
                serviceProvider: "Google Gemini",
                modelName,
                endpoint: "/api/ai/rights",
                promptTokens: result.response.usageMetadata.promptTokenCount,
                completionTokens: result.response.usageMetadata.candidatesTokenCount,
                totalTokens: result.response.usageMetadata.totalTokenCount,
                metadata: { language }
            });
        }
    } catch (logErr) {
        console.error("[api/ai/rights] Usage logging failed:", logErr);
    }

    return NextResponse.json({ response: result.response.text() });
  } catch (error: any) {
    console.error('Error in AI Legal route:', error);
    if (error instanceof AiBusyError) {
      return NextResponse.json({ error: error.message, code: 'AI_BUSY' }, { status: 503 });
    }
    return NextResponse.json({ error: 'The AI assistant could not answer right now. Please try again.' }, { status: 500 });
  }
}
