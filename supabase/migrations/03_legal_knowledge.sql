-- 1. Legal Knowledge Base Table (For RAG)
create table public.legal_knowledge (
  id uuid default gen_random_uuid() primary key,
  title text not null, -- e.g., 'IPC Section 420'
  content text not null, -- The actual text of the law
  embedding vector(768), -- HuggingFace embeddings (e.g., all-mpnet-base-v2 uses 768 dimensions)
  metadata jsonb, -- Tags, case law citations, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Function for AI Semantic Search
create or replace function match_legal_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    legal_knowledge.id,
    legal_knowledge.title,
    legal_knowledge.content,
    legal_knowledge.metadata,
    1 - (legal_knowledge.embedding <=> query_embedding) as similarity
  from legal_knowledge
  where 1 - (legal_knowledge.embedding <=> query_embedding) > match_threshold
  order by legal_knowledge.embedding <=> query_embedding
  limit match_count;
$$;

-- Enable RLS
alter table public.legal_knowledge enable row level security;

-- EVERYONE can read the laws
create policy "Public can read knowledge base" 
on public.legal_knowledge for select 
to authenticated, anon
using (true);
