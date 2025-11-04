export interface MessageContent {
  content?: string;
  type?: 'user' | 'assistant';
  message?: string;
  text?: string;
  [key: string]: unknown;
}

export interface N8nChatMessage {
  id: number;
  session_id: string;
  message: string | MessageContent | null;
  user_id: string;
  created_at?: string; // Opcional para compatibilidade
  model?: string; // Modelo de IA usado (d&o, rc-profissional, rc-geral, global)
  file_url?: string | null; // URL do arquivo anexado
  file_name?: string | null; // Nome do arquivo anexado
  file_type?: string | null; // Tipo MIME do arquivo
}

export interface ChatSession {
  session_id: string;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
  file?: {
    url: string;
    type: string;
    name: string;
  };
  feedback?: 'positive' | 'negative';
  model?: string; // Modelo de IA usado para gerar esta resposta
}