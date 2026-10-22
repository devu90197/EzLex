import os
from fastapi import FastAPI, Request
from pydantic import BaseModel
import google.generativeai as genai
from sentence_transformers import SentenceTransformer
from supabase import create_client, Client

# This ensures it runs as a Vercel Serverless Function
app = FastAPI()

# Init Models (Handles cold starts by lazy loading during first request or cache)
gemini_api_key = os.getenv("GOOGLE_API_KEY")
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if gemini_api_key:
    genai.configure(api_key=gemini_api_key)
    # Using the fast 1.5 flash model recommended for Vercel
    llm_model = genai.GenerativeModel('gemini-1.5-flash')

# Load Embedding Model using HuggingFace
# Warning: Vercel has a 250MB size limit. The all-MiniLM-L6-v2 is ultra-light (~80MB) and perfect for serverless.
embedder = SentenceTransformer('all-MiniLM-L6-v2')

supabase: Client = None
if supabase_url and supabase_key:
    supabase = create_client(supabase_url, supabase_key)

class ChatRequest(BaseModel):
    user_query: str
    language: str = "en"
    session_id: str = "anonymous"

@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    query = request.user_query
    
    try:
        # Step 1: Embed the user's query
        query_vector = embedder.encode(query).tolist()
        
        # Step 2: Semantic Search against Supabase 
        # (Assuming you populated the `legal_knowledge` table via the SQL script)
        rag_context = ""
        if supabase:
            response = supabase.rpc("match_legal_knowledge", {
                "query_embedding": query_vector,
                "match_threshold": 0.5,
                "match_count": 3
            }).execute()
            
            if response.data:
                for idx, row in enumerate(response.data):
                    rag_context += f"Law/Section {idx+1}: {row['title']}\nText: {row['content']}\n\n"

        # Step 3: Call Google Gemini Studio with the Context and Query
        system_prompt = f"""
        You are an expert AI Legal Assistant handling queries related to the Bharatiya Nyaya Sanhita (BNS) and Indian law.
        The user is talking to you in language: {request.language}.
        Always reply in the user's requested language.
        
        Below is the exact, factual legal statute retrieved from our database regarding their query. 
        You MUST use this context to answer their question. If the context is empty or irrelevant, tell them you don't have the specific law in your database.
        
        LEGAL RETRIEVAL CONTEXT:
        {rag_context}
        """
        
        if not gemini_api_key:
            return {"role": "assistant", "content": "Development mode: Add GOOGLE_API_KEY to .env.local to activate the AI."}
            
        ai_response = llm_model.generate_content(f"{system_prompt}\n\nUser Query: {query}")
        
        return {
            "role": "assistant",
            "content": ai_response.text,
            "citations_used": bool(rag_context.strip())
        }

    except Exception as e:
        return {"error": str(e), "message": "Failed to process the AI intent."}
