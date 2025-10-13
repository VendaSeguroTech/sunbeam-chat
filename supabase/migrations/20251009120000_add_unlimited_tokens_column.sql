-- Adiciona a coluna unlimited_tokens para permitir acesso irrestrito a não-admins.
ALTER TABLE public.profiles
ADD COLUMN unlimited_tokens boolean NOT NULL DEFAULT false;
