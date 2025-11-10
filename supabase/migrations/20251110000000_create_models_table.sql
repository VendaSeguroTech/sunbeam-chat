-- Create models table for managing AI model visibility
CREATE TABLE IF NOT EXISTS public.models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view public models
CREATE POLICY "Anyone can view public models"
  ON public.models
  FOR SELECT
  USING (is_public = true);

-- Policy: Admins can view all models
CREATE POLICY "Admins can view all models"
  ON public.models
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can insert models
CREATE POLICY "Admins can insert models"
  ON public.models
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can update models
CREATE POLICY "Admins can update models"
  ON public.models
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can delete models
CREATE POLICY "Admins can delete models"
  ON public.models
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert existing models from ModelSelector (all starting as public)
INSERT INTO public.models (name, display_name, description, is_public) VALUES
  ('pro', 'Pro-v1', 'Modelo Pro versão 1', true),
  ('inter', 'Pro-v2', 'Modelo Pro versão 2', true),
  ('basic', 'Basic', 'Modelo Básico', true)
ON CONFLICT (name) DO NOTHING;
