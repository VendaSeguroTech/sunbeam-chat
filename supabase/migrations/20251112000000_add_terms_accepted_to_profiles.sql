-- Adicionar coluna terms_accepted à tabela profiles
-- Esta coluna armazena se o usuário aceitou os termos de uso

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;

-- Adicionar coluna terms_accepted_at para registrar quando aceitou
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.terms_accepted IS 'Indica se o usuário aceitou os termos de uso';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Data e hora em que o usuário aceitou os termos';
