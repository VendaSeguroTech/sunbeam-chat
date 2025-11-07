-- Tabela para armazenar reports de bugs/problemas dos usuários
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- RLS Policies
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir seus próprios reports
CREATE POLICY "Users can insert their own bug reports"
  ON bug_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem ver seus próprios reports
CREATE POLICY "Users can view their own bug reports"
  ON bug_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todos os reports
CREATE POLICY "Admins can view all bug reports"
  ON bug_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins podem atualizar todos os reports (para mudar status)
CREATE POLICY "Admins can update all bug reports"
  ON bug_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bug_reports_updated_at_trigger
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_reports_updated_at();

-- Comentários
COMMENT ON TABLE bug_reports IS 'Armazena reports de bugs e problemas reportados pelos usuários';
COMMENT ON COLUMN bug_reports.status IS 'Status do report: pending, in_progress, resolved, closed';
