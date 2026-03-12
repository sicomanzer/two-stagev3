-- Create Journal Table
CREATE TABLE IF NOT EXISTS public.journal (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    date DATE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'WATCH', 'NOTE')),
    price DECIMAL(10, 2),
    shares DECIMAL(15, 4),
    thesis TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own entries
CREATE POLICY "Users can read their own journal entries" ON public.journal
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own entries
CREATE POLICY "Users can insert their own journal entries" ON public.journal
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own entries
CREATE POLICY "Users can update their own journal entries" ON public.journal
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own entries
CREATE POLICY "Users can delete their own journal entries" ON public.journal
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_journal_updated_at
    BEFORE UPDATE ON public.journal
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
