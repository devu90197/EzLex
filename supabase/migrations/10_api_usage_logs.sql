-- Create a table to track API usage and token consumption
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    service_provider TEXT NOT NULL, -- e.g., 'Google Gemini', 'HuggingFace', 'OpenAI'
    model_name TEXT NOT NULL,       -- e.g., 'gemini-1.5-flash', 'text-embedding-004'
    endpoint TEXT NOT NULL,         -- e.g., '/api/ai/draft', '/api/ai/rights'
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER NOT NULL,
    metadata JSONB,                 -- Extra info like success/error or query length
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins should see all usage logs (Role: 'VERIFIED_LAWYER' or 'GOVT_AUTHORITY' in profiles)
-- But for now, let's just make it accessible to authorized service role for logging
-- and we'll handle dashboard viewing via API with master key.

CREATE POLICY "Admins can view all logs" 
ON public.api_usage_logs FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'GOVT_AUTHORITY' OR profiles.role = 'VERIFIED_LAWYER')
));

-- Allow service role to insert logs
CREATE POLICY "Service Role can insert logs" 
ON public.api_usage_logs FOR INSERT 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_service ON public.api_usage_logs(service_provider);
