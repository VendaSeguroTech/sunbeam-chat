import React, { useState, useEffect, useRef } from "react";
import { Paperclip, Send, Sparkles, Search, User, Bot, File as FileIcon, X, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import { supabase } from "@/supabase/client";
import { N8nChatMessage, Message, MessageContent } from "@/types/chat";
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
  const [userName, setUserName] = useState<string>(""); // New state for user name
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Estado para comandos e sugestão
  const [commands, setCommands] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  const { toast } = useToast();
  const { saveConversation, updateConversation, currentConversation } = useConversationHistory();
  const { fetchSessionMessages } = useN8nChatHistory();

  const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/db0eba25-1605-4358-b5ab-c8e75111e4cc";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Fetch user name from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
        } else if (profileData) {
          setUserName(profileData.name || '');
        }
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
    const loadedCommands = [
      '/suporte'
    ];
    setCommands(loadedCommands);
  }, []);

  const convertN8nMessagesToLocal = (n8nMessages: N8nChatMessage[]): Message[] => {
    console.log('🔄 Convertendo mensagens do n8n:', n8nMessages);
    
    const localMessages: Message[] = [];

    n8nMessages.forEach((record, index) => {
      const message = record.message;
      
      let content = 'Mensagem sem conteúdo';
      let type: 'user' | 'assistant' = 'user';
      
      if (typeof message === 'string') {
        content = message;
        type = index % 2 === 0 ? 'user' : 'assistant';
      } else if (message && typeof message === 'object') {
        const messageObj = message as MessageContent;
        
        if (messageObj.content && typeof messageObj.content === 'string') {
          content = messageObj.content;
        } else if (messageObj.message && typeof messageObj.message === 'string') {
          content = messageObj.message;
        } else if (messageObj.text && typeof messageObj.text === 'string') {
          content = messageObj.text;
        } else {
          content = JSON.stringify(messageObj, null, 2);
        }
        
        type = messageObj.type || (index % 2 === 0 ? 'user' : 'assistant');
      } else if (message === null || message === undefined) {
        content = 'Mensagem vazia';
        type = index % 2 === 0 ? 'user' : 'assistant';
      }
      
      console.log(`💬 Mensagem ${index + 1}: ${type} - "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);
      
      // New logic for splitting assistant messages
      if (type === 'assistant' && content.includes('\n\n')) {
        const chunks = content.split('\n\n').filter(c => c.trim() !== '');
        chunks.forEach((chunk, chunkIndex) => {
          localMessages.push({
            id: `${record.id?.toString() || `msg_${index}`}_${chunkIndex}`, // Unique ID for each chunk
            content: chunk.trim(),
            type,
            timestamp: new Date(record.created_at || new Date().toISOString())
          });
        });
      } else {
        localMessages.push({
          id: record.id?.toString() || `msg_${index}`,
          content: content.trim(),
          type,
          timestamp: new Date(record.created_at || new Date().toISOString())
        });
      }
    });

    return localMessages;
  };

  useEffect(() => {
    if (!isInitialized) return;

    const loadConversation = async () => {
      if (selectedSessionId) {
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
        setMessages(selectedConversation.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
        setIsNewChat(false);
      } else {
        setMessages([]);
        setIsNewChat(true);
        console.log('Nova conversa iniciada com sessionId existente:', sessionId);
      }
    };

    loadConversation();
  }, [selectedConversation, selectedSessionId, isInitialized]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    // Only save conversation when the assistant is not actively responding
    if (!isLoading && messages.length > 0 && !selectedSessionId && isInitialized) {
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
  }, [messages, isLoading, currentConversation, saveConversation, updateConversation, isNewChat, onNewChatStarted, selectedSessionId, isInitialized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

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
          return;
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const selectSuggestion = (command: string) => {
    const words = message.split(' ');
    words[words.length - 1] = command;
    const newMessage = words.join(' ');
    setMessage(newMessage);
    setShowSuggestions(false);
  };

  const handlePaperclipClick = () => {
    if (messages.length >= MESSAGE_LIMIT) {
      toast({
        title: "Limite de mensagens atingido",
        description: "Você não pode enviar arquivos quando o limite de mensagens é atingido.",
        variant: "destructive",
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Erro", description: "O arquivo é muito grande (máx 10MB).", variant: "destructive" });
      return;
    }

    setAttachedFile(file);
  };

  const extractResponseText = (data: WebhookResponse): string => {
    // Prioritize the 'output' field as requested for the new logic
    if (data.output && typeof data.output === 'string') {
      return data.output;
    }
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

  

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const streamResponseAsSeparateMessages = async (fullText: string) => {
    const chunks = fullText.split('\n\n').filter(c => c.trim() !== '');
  
    for (const chunk of chunks) {
      const messageId = (Date.now() + Math.random()).toString();
      const assistantMessage: Message = {
        id: messageId,
        content: "",
        type: 'assistant',
        timestamp: new Date()
      };
      
      // Add the new empty message bubble
      setMessages(prev => [...prev, assistantMessage]);
      
      // Typing effect for the current chunk
      const characterDelay = 20;
      const chunkTypingTime = chunk.length * characterDelay;
      const maxDelay = 3000;
      const effectiveTypingTime = Math.min(chunkTypingTime, maxDelay);
      const delayPerCharacter = effectiveTypingTime > 0 && chunk.length > 0 ? effectiveTypingTime / chunk.length : 0;
  
      let currentContent = "";
      for (let i = 0; i < chunk.length; i++) {
        currentContent += chunk[i];
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, content: currentContent } : msg
          )
        );
        if (delayPerCharacter > 0) {
          await sleep(delayPerCharacter);
        }
      }
      
      // Wait before showing the next message bubble
      await sleep(1000); 
    }
  };

  const handleFeedback = async (messageId: string, rating: 'positive' | 'negative') => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.feedback) return;

    const payload = {
      message: message.content,
      rating: rating,
      sessionId: sessionId,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('https://webhook.vendaseguro.tech/webhook/cbc7d3b3-66ff-42b4-a1d4-303a03e60d5a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      setMessages(prevMessages => prevMessages.map(m => 
        m.id === messageId ? { ...m, feedback: rating } : m
      ));

      toast({
        title: "Feedback enviado",
        description: "Obrigado pela sua avaliação!",
      });

    } catch (error) {
      console.error("Failed to send feedback:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar seu feedback. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (event?: React.FormEvent | React.KeyboardEvent): Promise<void> => {
    if (event) {
      event.preventDefault();
    }

    if ((!message.trim() && !attachedFile) || isLoading || !sessionId || !currentUserId) {
      return;
    }

    if (messages.length >= MESSAGE_LIMIT) {
      toast({
        title: "Limite de mensagens atingido",
        description: "Por favor, inicie um novo chat para continuar.",
        variant: "destructive",
      });
      return;
    }

    const userMessageContent = message.trim();
    const fileToSend = attachedFile;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: userMessageContent,
      type: 'user',
      timestamp: new Date(),
      file: fileToSend ? {
        url: URL.createObjectURL(fileToSend),
        type: fileToSend.type,
        name: fileToSend.name
      } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setAttachedFile(null);
    setIsLoading(true);

    try {
      let response: Response;

      if (fileToSend) {
        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('sessionId', sessionId);
        formData.append('userId', currentUserId);
        formData.append('type', fileToSend.type);
        formData.append('message', userMessageContent || `Arquivo enviado: ${fileToSend.name}`);

        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data: WebhookResponse = await response.json();
        let aiResponseContent = extractResponseText(data);

        if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
          aiResponseContent = "Recebi o arquivo, mas não consegui processá-lo.";
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponseContent,
          type: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

      } else {
        // New logic for text messages with separate message bubbles
        const payload = {
          message: userMessageContent,
          timestamp: userMessage.timestamp.toISOString(),
          messageId: userMessage.id,
          sessionId: sessionId,
          userId: currentUserId,
          type: 'text'
        };

        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data: WebhookResponse = await response.json();
        const aiResponseContent = extractResponseText(data);

        if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: "Não recebi uma resposta válida do assistente.",
                type: 'assistant',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } else {
            await streamResponseAsSeparateMessages(aiResponseContent);
        }
      }

      if (isNewChat) {
        setIsNewChat(false);
        onNewChatStarted?.();
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem ou processar resposta:', error);
      // Only remove the user's message that initiated the failed response
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      
      let errorMessage = "Não foi possível obter a resposta do assistente. Tente novamente.";
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
    } finally {
      setIsLoading(false);
    }
  };

  const renderWithEmphasis = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-chat-background relative">
      {messages.length > 0 ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
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
            
            {messages.map((msg, index) => {
              const showAvatar = msg.type === 'assistant' && (index === 0 || messages[index - 1]?.type !== 'assistant');

              return (
                <div key={msg.id} className={`group flex items-start gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'assistant' && (
                    showAvatar ? (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <img src={sunbeamLogo} alt="AI" className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0" /> // Placeholder for alignment
                    )
                  )}
                  
                  <div className={`flex-1 flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-2xl transition-transform duration-200 active:scale-[0.97] ${
                      msg.type === 'user' 
                        ? 'bg-primary text-primary-foreground ml-12 rounded-2xl p-4 shadow-apple active:shadow-sm' 
                        : 'bg-transparent border-none shadow-none p-0'
                    }`}>
                      {msg.file ? (
                        <div className="flex flex-col gap-2">
                          {msg.file.type.startsWith('image/') ? (
                            <img src={msg.file.url} alt={msg.file.name} className="max-w-xs rounded-lg cursor-pointer" onClick={() => window.open(msg.file.url, '_blank')} />
                          ) : (
                            <a 
                              href={msg.file.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className={`flex items-center gap-3 p-3 rounded-lg ${
                                msg.type === 'user' 
                                ? 'bg-black/10 hover:bg-black/20'
                                : 'bg-primary/10 hover:bg-primary/20'
                              }`}
                            >
                              <FileIcon className={`w-6 h-6 flex-shrink-0 ${
                                msg.type === 'user' ? 'text-primary-foreground' : 'text-primary'
                              }`} />
                              <div className="flex flex-col overflow-hidden">
                                <span className={`text-xs font-bold ${
                                  msg.type === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}>Anexo</span>
                                <span className={`text-sm font-medium truncate ${
                                  msg.type === 'user' ? 'text-primary-foreground' : 'text-primary'
                                }`}>
                                  {msg.file.name}
                                </span>
                              </div>
                            </a>
                          )}
                          {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap pt-2">{renderWithEmphasis(msg.content)}</p>}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderWithEmphasis(msg.content)}</p>
                      )}
                      {msg.type === 'user' && (
                        <p className={`text-xs mt-2 opacity-70 text-primary-foreground/70`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {msg.type === 'assistant' && msg.content && (
                      <div className="flex items-center gap-1 mt-2 pl-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-full ${msg.feedback === 'positive' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                          onClick={() => handleFeedback(msg.id, 'positive')}
                          disabled={!!msg.feedback}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-full ${msg.feedback === 'negative' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                          onClick={() => handleFeedback(msg.id, 'negative')}
                          disabled={!!msg.feedback}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {msg.type === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              )
            })}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center p-2 bg-muted shadow-glow dark:bg-transparent dark:shadow-none">
              <img 
                src={sunbeamLogo} 
                alt="VIA" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground mb-3">
              {userName ? `Olá ${userName} ` : "Olá, sou VIA."}
            </h1>
            <p className="text-lg text-muted-foreground">
              Como posso ajudá-lo hoje?
            </p>
            
            {sessionId && (
              <p className="text-xs text-muted-foreground mt-4 opacity-50">
                SessionID: {sessionId.slice(-8)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-border bg-chat-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {attachedFile && (
              <div className="bg-chat-input border border-border border-b-0 rounded-t-2xl p-3 -mb-2">
                <div className="flex items-center justify-between bg-muted p-2 rounded-lg">
                  <div className="flex items-center gap-2 text-sm overflow-hidden">
                    <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{attachedFile.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({(attachedFile.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full flex-shrink-0"
                    onClick={() => setAttachedFile(null)}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className={`flex items-center gap-2 bg-chat-input border border-border p-3 shadow-sm hover:shadow-md transition-shadow ${attachedFile ? 'rounded-b-2xl' : 'rounded-2xl'}`}>
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
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif, application/pdf"
                />
                {showSuggestions && (
                  <ul className="absolute bottom-full mb-1 left-0 w-full max-h-40 overflow-auto bg-white border border-gray-300 rounded shadow z-10">
                    {filteredCommands.map((cmd, index) => (
                      <li
                        key={cmd}
                        className={`px-3 py-1 cursor-pointer hover:bg-gray-200 ${index === selectedSuggestionIndex ? 'bg-gray-300' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
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
                  onClick={handlePaperclipClick}
                  disabled={isLoading || messages.length >= MESSAGE_LIMIT}
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>

                <Button
                  onClick={handleSendMessage}
                  disabled={(!message.trim() && !attachedFile) || isLoading || !sessionId || messages.length >= MESSAGE_LIMIT}
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
