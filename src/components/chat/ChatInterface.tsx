import React, { useState, useEffect, useRef } from "react"; 
import { Paperclip, Send, Sparkles, Search, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import sunbeamLogo from "@/assets/logo2.png";

interface Message {
  id: string;
  content: string;
  type: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatInterfaceProps {
  selectedConversation?: ConversationHistory | null;
  onNewChatStarted?: () => void; // Nova prop para notificar quando nova conversa começar
}

// Interface para a resposta do webhook do n8n
interface WebhookResponse {
  response?: string;
  message?: string;
  data?: string | object | null;
  content?: string;
  text?: string;
  result?: string;
  output?: string;
  [key: string]: unknown;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  selectedConversation, 
  onNewChatStarted 
}) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [isNewChat, setIsNewChat] = useState<boolean>(true); // Flag para identificar nova conversa
  const { toast } = useToast();
  const { saveConversation, updateConversation, currentConversation } = useConversationHistory();

  const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/3676d883-dff1-4123-8de5-5a54de5781a0 ";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Função para gerar novo sessionId
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Carregar conversa selecionada
  useEffect(() => {
    if (selectedConversation) {
      setMessages(selectedConversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
      setIsNewChat(false);
      // Manter o sessionId da conversa existente ou gerar um novo se necessário
      setSessionId(generateSessionId());
    } else {
      // Nova conversa - limpar mensagens e gerar novo sessionId
      setMessages([]);
      setIsNewChat(true);
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      console.log('Nova conversa iniciada com sessionId:', newSessionId);
    }
  }, [selectedConversation]);

  // Auto-scroll para a mensagem mais recente
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Salvar/atualizar conversa quando mensagens mudam
  useEffect(() => {
    if (messages.length > 0) {
      const saveOrUpdateConversation = async () => {
        if (currentConversation && !isNewChat) {
          // Atualizar conversa existente
          await updateConversation(currentConversation.id, messages);
        } else if (messages.length >= 2 && isNewChat) {
          // Salvar nova conversa (quando há pelo menos uma pergunta e resposta)
          await saveConversation(messages);
          setIsNewChat(false); // Marcar como conversa existente após salvar
          onNewChatStarted?.(); // Notificar que nova conversa foi criada
        }
      };

      saveOrUpdateConversation();
    }
  }, [messages, currentConversation, saveConversation, updateConversation, isNewChat, onNewChatStarted]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const extractResponseText = (data: WebhookResponse): string => {
    if (data.response && typeof data.response === 'string') {
      return data.response;
    }
    
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }
    
    if (data.content && typeof data.content === 'string') {
      return data.content;
    }
    
    if (data.text && typeof data.text === 'string') {
      return data.text;
    }
    
    if (data.result && typeof data.result === 'string') {
      return data.result;
    }
    
    if (data.output && typeof data.output === 'string') {
      return data.output;
    }
    
    if (data.data && typeof data.data === 'string') {
      return data.data;
    }
    
    if (data.data && typeof data.data === 'object' && data.data !== null) {
      const dataObj = data.data as Record<string, unknown>;
      
      if (dataObj.response && typeof dataObj.response === 'string') {
        return dataObj.response;
      }
      
      if (dataObj.message && typeof dataObj.message === 'string') {
        return dataObj.message;
      }
      
      if (dataObj.text && typeof dataObj.text === 'string') {
        return dataObj.text;
      }
    }
    
    return JSON.stringify(data, null, 2);
  };

  const handleSendMessage = async (): Promise<void> => {
    if (message.trim() && !isLoading) {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message.trim(),
        type: 'user',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setMessage("");
      setIsLoading(true);

      try {
        console.log('Enviando mensagem com sessionId:', sessionId);
        
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage.content,
            timestamp: userMessage.timestamp.toISOString(),
            messageId: userMessage.id,
            sessionId: sessionId
          })
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data: WebhookResponse = await response.json();
        
        console.log('Resposta do n8n:', data);
        console.log('SessionId enviado:', sessionId);
        
        let aiResponseContent = extractResponseText(data);

        if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
          aiResponseContent = "Recebi sua mensagem, mas não consegui gerar uma resposta adequada.";
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponseContent,
          type: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);

      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        
        let errorMessage = "Não foi possível enviar a mensagem. Tente novamente.";
        
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch')) {
            errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
          } else if (error.message.includes('HTTP')) {
            errorMessage = `Erro do servidor: ${error.message}`;
          }
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive",
        });

        setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        
        const errorAssistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
          type: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, errorAssistantMessage]);
        
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-chat-background relative">
      {/* Messages Area */}
      {messages.length > 0 ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Indicador de nova conversa */}
            {isNewChat && messages.length > 0 && (
              <div className="text-center py-2">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  Nova conversa iniciada • SessionID: {sessionId.slice(-8)}
                </span>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <img src={sunbeamLogo} alt="AI" className="w-5 h-5" />
                  </div>
                )}
                
                <div className={`max-w-2xl rounded-2xl p-4 shadow-md ${
                  msg.type === 'user' 
                    ? 'bg-primary text-primary-foreground ml-12' 
                    : 'bg-chat-bubble-assistant border border-border mr-12'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 opacity-70 ${
                    msg.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>

                {msg.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                  <img src={sunbeamLogo} alt="AI" className="w-5 h-5" />
                </div>
                <div className="bg-chat-bubble-assistant border border-border rounded-2xl p-4 mr-12">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        /* Welcome Section */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow p-2">
              <img 
                src={sunbeamLogo} 
                alt=" VIA" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-3">
              Olá, sou VIA.
            </h1>
            <p className="text-lg text-muted-foreground">
              Como posso ajudá-lo hoje?
            </p>
            
            {/* Mostrar sessionId na tela de boas-vindas */}
            <p className="text-xs text-muted-foreground mt-4 opacity-50">
              SessionID: {sessionId.slice(-8)}
            </p>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="border-t border-border bg-chat-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="flex items-center gap-2 bg-chat-input border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Conversar com V.IA "
                className="flex-1 border-0 bg-transparent placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              />
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                  className="h-8 w-8 p-0 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4 text-primary-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/20 hover:border-primary hover:bg-primary/5 text-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Criatividade Avançada
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/20 hover:border-primary hover:bg-primary/5 text-primary"
              >
                <Search className="w-4 h-4 mr-2" />
                Pesquisar
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            A IA pode cometer erros. Considere verificar informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;