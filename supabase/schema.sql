-- MarketPulse Database Schema for Supabase PostgreSQL

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Watchlist Stocks Table
CREATE TABLE IF NOT EXISTS public.watchlist_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_symbol VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_stock UNIQUE(user_id, stock_symbol)
);

-- 2. User Stock State Table (Stores last seen price & timestamp for comparison)
CREATE TABLE IF NOT EXISTS public.user_stock_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stock_symbol VARCHAR(20) NOT NULL,
    last_seen_price NUMERIC(10, 2),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_stock_state UNIQUE(user_id, stock_symbol)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.watchlist_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stock_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watchlist_stocks
DROP POLICY IF EXISTS "Users can view their own watchlist stocks" ON public.watchlist_stocks;
CREATE POLICY "Users can view their own watchlist stocks" 
    ON public.watchlist_stocks FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own watchlist stocks" ON public.watchlist_stocks;
CREATE POLICY "Users can insert their own watchlist stocks" 
    ON public.watchlist_stocks FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watchlist stocks" ON public.watchlist_stocks;
CREATE POLICY "Users can delete their own watchlist stocks" 
    ON public.watchlist_stocks FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for user_stock_state
DROP POLICY IF EXISTS "Users can view their own stock states" ON public.user_stock_state;
CREATE POLICY "Users can view their own stock states" 
    ON public.user_stock_state FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own stock states" ON public.user_stock_state;
CREATE POLICY "Users can insert/update their own stock states" 
    ON public.user_stock_state FOR ALL 
    USING (auth.uid() = user_id);
