import React, { useState, useEffect, useRef } from "react";
import { Paperclip, Send, Sparkles, Search, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import { supabase } from "@/supabase/client";
import { N8nChatMessage, Message, MessageContent } from "@/types/chat"; // Importar do arquivo de tipos
import sunbeamLogo from "@/assets/logo2.png";

interface ChatInterfaceProps {
  selectedConversation?: ConversationHistory | null;
  selectedSessionId?: string | null;
  onNewChatStarted?: () => void;
}

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
  selectedSessionId,
  onNewChatStarted
}) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [isNewChat, setIsNewChat] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Estado para comandos e sugestão
  const [commands, setCommands] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const { toast } = useToast();
  const { saveConversation, updateConversation, currentConversation } = useConversationHistory();
  const { fetchSessionMessages } = useN8nChatHistory();

  const WEBHOOK_URL = "https://webhook.vendaseguro.tech/webhook/13852b9f-9fdb-4bc1-bbe8-973e2d7b7673";

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const MESSAGE_LIMIT = 50;
  const MESSAGE_WARNING_THRESHOLD = 45;

  // Função para gerar novo sessionId
  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Obter user_id atual - executar apenas uma vez
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Inicializar sessionId apenas uma vez quando o componente monta
  useEffect(() => {
    if (!isInitialized) {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setIsInitialized(true);
      console.log('SessionId inicial gerado:', newSessionId);
    }
  }, [isInitialized]);

  // Função para carregar comandos do arquivo comandos.txt
  useEffect(() => {
    // Como não podemos ler arquivos diretamente no frontend, vou simular a leitura
    // com os comandos que vimos no arquivo comandos.txt
    const loadedCommands = [
      '/insert',
      '/suporte'
    ];
    setCommands(loadedCommands);
  }, []);

  // Converter mensagens do n8n para o formato local (com tratamento de created_at opcional)
  // No ChatInterface.tsx, substitua a função convertN8nMessagesToLocal por esta versão completa:

  const convertN8nMessagesToLocal = (n8nMessages: N8nChatMessage[]): Message[] => {
    console.log('🔄 Convertendo mensagens do n8n:', n8nMessages);
    
    return n8nMessages.map((record, index) => {
      const message = record.message;
      
      let content = 'Mensagem sem conteúdo';
      let type: 'user' | 'assistant' = 'user';
      
      // 🎯 Processar diferentes tipos de mensagem
      if (typeof message === 'string') {
        content = message;
        // Alternar entre user e assistant baseado no índice
        // Índices pares (0, 2, 4...) = user, ímpares (1, 3, 5...) = assistant
        type = index % 2 === 0 ? 'user' : 'assistant';
      } else if (message && typeof message === 'object') {
        const messageObj = message as MessageContent;
        
        // Tentar extrair conteúdo de diferentes propriedades
        if (messageObj.content && typeof messageObj.content === 'string') {
          content = messageObj.content;
        } else if (messageObj.message && typeof messageObj.message === 'string') {
          content = messageObj.message;
        } else if (messageObj.text && typeof messageObj.text === 'string') {
          content = messageObj.text;
        } else {
          // Se não encontrar conteúdo, tentar converter o objeto para string
          content = JSON.stringify(messageObj, null, 2);
        }
        
        // Usar o tipo especificado na mensagem ou alternar baseado no índice
        type = messageObj.type || (index % 2 === 0 ? 'user' : 'assistant');
      } else if (message === null || message === undefined) {
        content = 'Mensagem vazia';
        type = index % 2 === 0 ? 'user' : 'assistant';
      }
      
      // Log para debug
      console.log(`💬 Mensagem ${index + 1}: ${type} - "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      
      return {
        id: record.id?.toString() || `msg_${index}`,
        content: content.trim(), // Remover espaços extras
        type,
        timestamp: new Date(record.created_at || new Date().toISOString())
      };
    });
  };
  // Carregar conversa selecionada - com controle melhor das dependências
  useEffect(() => {
    if (!isInitialized) return; // Aguardar inicialização

    const loadConversation = async () => {
      if (selectedSessionId) {
        // Carregar sessão do n8n
        setIsLoading(true);
        try {
          const n8nMessages = await fetchSessionMessages(selectedSessionId);
          const convertedMessages = convertN8nMessagesToLocal(n8nMessages);
          setMessages(convertedMessages);
          setSessionId(selectedSessionId);
          setIsNewChat(false);
          console.log('Sessão do n8n carregada:', selectedSessionId);
        } catch (error) {
          console.error('Erro ao carregar sessão do n8n:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a conversa.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      } else if (selectedConversation) {
        // Carregar conversa do sistema antigo
        setMessages(selectedConversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setIsNewChat(false);
        // Manter o sessionId atual para conversas antigas
      } else {
        // Nova conversa - limpar mensagens mas manter sessionId
        setMessages([]);
        setIsNewChat(true);
        console.log('Nova conversa iniciada com sessionId existente:', sessionId);
      }
    };

    loadConversation();
  }, [selectedConversation, selectedSessionId, isInitialized]);

  // Auto-scroll para a mensagem mais recente
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Salvar/atualizar conversa quando mensagens mudam (apenas para sistema antigo)
  useEffect(() => {
    if (messages.length > 0 && !selectedSessionId && isInitialized) {
      const saveOrUpdateConversation = async () => {
        if (currentConversation && !isNewChat) {
          await updateConversation(currentConversation.id, messages);
        } else if (messages.length >= 2 && isNewChat) {
          await saveConversation(messages);
          setIsNewChat(false);
          onNewChatStarted?.();
        }
      };

      saveOrUpdateConversation();
    }
  }, [messages, currentConversation, saveConversation, updateConversation, isNewChat, onNewChatStarted, selectedSessionId, isInitialized]);

  // Função para lidar com mudanças no input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Verifica se o usuário digitou '/' para ativar sugestão
    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      const query = lastWord.toLowerCase();
      const filtered = commands.filter(cmd => cmd.startsWith(query));
      setFilteredCommands(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  // Função para lidar com teclas no input para navegação e seleção
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands.length > 0) {
          selectSuggestion(filteredCommands[selectedSuggestionIndex]);
          return; // Prevent sending message when selecting suggestion with Enter
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Função para selecionar sugestão
  const selectSuggestion = (command: string) => {
    // Substitui a última palavra (começando com '/') pelo comando selecionado
    const words = message.split(' ');
    words[words.length - 1] = command;
    const newMessage = words.join(' ');
    setMessage(newMessage);
    setShowSuggestions(false);
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

  const handleSendMessage = async (event?: React.FormEvent | React.KeyboardEvent): Promise<void> => {
    if (event) {
      event.preventDefault(); // Prevenir comportamento padrão (ex: quebra de linha no Enter)
    }

    if (messages.length >= MESSAGE_LIMIT) {
      toast({
        title: "Limite de mensagens atingido",
        description: "Por favor, inicie um novo chat para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!message.trim() || isLoading || !sessionId || !currentUserId) {
      console.log('🚫 === DEBUG BLOQUEIO ===');
      console.log('💬 Message:', message.trim());
      console.log('⏳ IsLoading:', isLoading);
      console.log('🆔 SessionId:', sessionId);
      console.log('👤 CurrentUserId:', currentUserId);
      return;
    }

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
      console.log('🚀 === DEBUG ENVIO ===');
      console.log('📝 SessionId:', sessionId);
      console.log('👤 UserId:', currentUserId);
      console.log('💬 Mensagem:', userMessage.content);
      console.log('🌐 Webhook URL:', WEBHOOK_URL);

      const payload = {
        message: userMessage.content,
        timestamp: userMessage.timestamp.toISOString(),
        messageId: userMessage.id,
        sessionId: sessionId,
        userId: currentUserId
      };

      console.log('📦 Payload completo:', JSON.stringify(payload, null, 2));

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data: WebhookResponse = await response.json();

      console.log('✅ Resposta do n8n:', data);

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

      if (isNewChat) {
        setIsNewChat(false);
        onNewChatStarted?.();
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);

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
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-chat-background relative">
      {/* Messages Area */}
      {messages.length > 0 ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Indicador de nova conversa ou sessão carregada */}
            {(isNewChat && messages.length > 0) || selectedSessionId ? (
              <div className="text-center py-2">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {selectedSessionId 
                    ? `Sessão carregada • ${selectedSessionId.slice(-8)}`
                    : `Nova conversa iniciada • SessionID: ${sessionId.slice(-8)}`
                  }
                </span>
              </div>
            ) : null}
            
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <img src={sunbeamLogo} alt="AI" className="w-8 h-8" />
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
                alt="VIA" 
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
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-4 opacity-50">
                SessionID: {sessionId.slice(-8)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="border-t border-border bg-chat-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="flex items-center gap-2 bg-chat-input border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative w-full">
                <Input
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    messages.length >= MESSAGE_LIMIT
                      ? "Limite de mensagens atingido."
                      : "Conversar com V.IA"
                  }
                  className="flex-1 border-0 bg-transparent placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                  disabled={isLoading || messages.length >= MESSAGE_LIMIT}
                />

                {/* Lista de sugestões */}
                {showSuggestions && (
                  <ul className="absolute bottom-full mb-1 left-0 w-full max-h-40 overflow-auto bg-white border border-gray-300 rounded shadow z-10">
                    {filteredCommands.map((cmd, index) => (
                      <li
                        key={cmd}
                        className={`px-3 py-1 cursor-pointer hover:bg-gray-200 ${index === selectedSuggestionIndex ? 'bg-gray-300' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Para evitar que o input perca o foco
                          selectSuggestion(cmd);
                        }}
                      >
                        {cmd}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  disabled={messages.length >= MESSAGE_LIMIT}
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading || !sessionId || messages.length >= MESSAGE_LIMIT}
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

            {messages.length >= MESSAGE_WARNING_THRESHOLD && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {messages.length >= MESSAGE_LIMIT
                  ? "Você atingiu o limite de mensagens. Por favor, inicie um novo chat."
                  : `${MESSAGE_LIMIT - messages.length} mensagens restantes neste chat.`
                }
              </p>
            )}

            <div className="flex justify-center gap-2 mt-4 cursor-not-allowed">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/20 hover:border-neutral-300 hover:bg-primary/5 text-primary cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 mr-2 " />
                Criatividade Avançada
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-primary/20 hover:border-neutral-300 hover:bg-primary/5 text-primary cursor-not-allowed"
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