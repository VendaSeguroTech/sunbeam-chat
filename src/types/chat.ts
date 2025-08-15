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
}