import React, { useState, useEffect, useRef } from "react";
import { Paperclip, Send, Sparkles, Search, User, File as FileIcon, X, ThumbsUp, ThumbsDown, Coins, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import { useTokens } from "@/hooks/useTokens";
import { supabase } from "@/supabase/client";
import { N8nChatMessage, Message, MessageContent } from "@/types/chat";
import expertaAvatarLogo from "@/assets/experta-avatar-logo.png";

interface ChatInterfaceProps {
  selectedConversation?: ConversationHistory | null;
  selectedSessionId?: string | null;
  onNewChatStarted?: () => void;
  selectedModel?: string; // Nova prop para o modelo selecionado
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
  onNewChatStarted,
  selectedModel // Desestruturar a nova prop
}) => {
  const [message, setMessage] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [isNewChat, setIsNewChat] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isAdvancedCreativity, setIsAdvancedCreativity] = useState<boolean>(false);

  // Autocomplete de comandos
  const [commands, setCommands] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Sugestões de perguntas do backend
  const [questionSuggestions, setQuestionSuggestions] = useState<string[]>([]);

  // 🔥 Frases dinâmicas durante o loading
  const [loadingBlurb, setLoadingBlurb] = useState<string>("");
  const hasShownThabataOnceRef = useRef<boolean>(false); // garante exibir "o que a Thabata responderia?" só 1x em toda a sessão
  const hasShownLowTokensWarning = useRef<boolean>(false); // controla aviso de tokens baixos

  const { toast } = useToast();
  const { saveConversation, updateConversation, currentConversation } = useConversationHistory();
  const { fetchSessionMessages } = useN8nChatHistory();
  const { tokens, hasUnlimitedTokens, canSendMessage, decrementToken, refreshTokens } = useTokens();

  const WEBHOOK_URL = "https://webhook.vendaseguro.tech/webhook/0fc3496c-5dfa-4772-8661-da71da6353c7";
  //const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7";


  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MESSAGE_LIMIT = 50;
  const MESSAGE_WARNING_THRESHOLD = 45;

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Usuário atual e nome
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
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

  // SessionId inicial
  useEffect(() => {
    if (!isInitialized) {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      setIsInitialized(true);
      console.log('SessionId inicial gerado:', newSessionId);
    }
  }, [isInitialized]);

  // Carregar comandos
  useEffect(() => {
    const loadedCommands = ['/suporte', '/insert'];
    setCommands(loadedCommands);
  }, []);

  // 🔁 Frases durante loading (com Thabata 1x por ciclo)
  useEffect(() => {
    let interval: number | undefined;

    if (isLoading) {
      // reset da flag a cada novo ciclo de loading
      hasShownThabataOnceRef.current = false;

      const basePhrases = ["pensando...", "realizando busca", "Já sei", "hmmm", "Estruturando a resposta..."];
      let sequence = basePhrases; // a rotação normal NUNCA contém a frase da Thabata
      let i = 0;

      // Mostra a frase da Thabata imediatamente, uma única vez por ciclo
      if (!hasShownThabataOnceRef.current) {
        setLoadingBlurb("o que a Thabata responderia?");
        hasShownThabataOnceRef.current = true; // marca já exibida neste ciclo
        i = -1; // no próximo tick começará do início das frases base
      } else {
        setLoadingBlurb(basePhrases[0]);
        i = 0;
      }

      interval = window.setInterval(() => {
        i = (i + 1) % sequence.length;
        setLoadingBlurb(sequence[i]);
      }, 3000); // ritmo leve
    } else {
      setLoadingBlurb("");
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isLoading]);

  // Aviso de tokens baixos
  useEffect(() => {
    if (!hasUnlimitedTokens && tokens === 3 && !hasShownLowTokensWarning.current) {
      hasShownLowTokensWarning.current = true;
      toast({
        title: "⚠️ Poucos tokens restantes!",
        description: `Você tem apenas ${tokens} tokens disponíveis. Entre em contato com um administrador para recarregar.`,
        variant: "default",
        duration: 6000,
      });
    }

    // Reset do aviso quando tokens aumentam (admin adicionou mais tokens)
    if (tokens > 3) {
      hasShownLowTokensWarning.current = false;
    }
  }, [tokens, hasUnlimitedTokens, toast]);

  const convertN8nMessagesToLocal = (n8nMessages: N8nChatMessage[]): Message[] => {
    console.log('🔄 Convertendo mensagens do n8n:', n8nMessages);
    const localMessages: Message[] = [];

    n8nMessages.forEach((record, index) => {
      const message = record.message;
      let content = 'Mensagem sem conteúdo';
      let type: 'user' | 'assistant' = 'assistant';

      // Primeiro, tenta extrair o tipo e conteúdo do objeto message
      if (typeof message === 'string') {
        content = message;
        // Para strings simples, assume alternância mas prefere verificar o contexto
        // Se não há type explícito, usa a alternância como fallback
        type = index % 2 === 0 ? 'user' : 'assistant';
      } else if (message && typeof message === 'object') {
        const messageObj = message as MessageContent;

        // Extrai o conteúdo
        if (messageObj.content && typeof messageObj.content === 'string') {
          content = messageObj.content;
        } else if (messageObj.message && typeof messageObj.message === 'string') {
          content = messageObj.message;
        } else if (messageObj.text && typeof messageObj.text === 'string') {
          content = messageObj.text;
        } else {
          content = JSON.stringify(messageObj, null, 2);
        }

        // CRÍTICO: Prioriza o campo type do objeto
        if (messageObj.type) {
          type = messageObj.type;
        } else {
          // Fallback para alternância apenas se não houver type
          type = index % 2 === 0 ? 'user' : 'assistant';
        }
      } else if (message === null || message === undefined) {
        content = 'Mensagem vazia';
        type = index % 2 === 0 ? 'user' : 'assistant';
      }

      console.log(`💬 Mensagem ${index + 1}: ${type} - "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`);

      // Se for mensagem da assistente e contém quebras de linha duplas, divide em chunks
      if (type === 'assistant' && content.includes('\n\n')) {
        const chunks = content.split('\n\n').filter(c => c.trim() !== '');
        chunks.forEach((chunk, chunkIndex) => {
          localMessages.push({
            id: `${record.id?.toString() || `msg_${index}`}_${chunkIndex}`,
            content: chunk.trim(),
            type,
            timestamp: new Date(record.created_at || new Date().toISOString()),
            model: record.model
          });
        });
      } else {
        localMessages.push({
          id: record.id?.toString() || `msg_${index}`,
          content: content.trim(),
          type,
          timestamp: new Date(record.created_at || new Date().toISOString()),
          model: record.model
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

  // Extrai sugestões do payload
  const extractQuestionSuggestions = (raw: unknown): string[] | null => {
    try {
      const payloads = Array.isArray(raw) ? raw : [raw];

      for (const item of payloads) {
        if (!item || typeof item !== 'object') continue;

        const containers: any[] = [];
        const pushIfObj = (v: any) => (v && typeof v === 'object') ? containers.push(v) : null;

        pushIfObj((item as any).output);
        pushIfObj((item as any).data?.output);
        pushIfObj((item as any).result?.output);
        pushIfObj((item as any).content?.output);
        // fallback: o próprio item pode ser o schema
        pushIfObj(item);

        for (const c of containers) {
          if (c?.type === 'object' && c?.properties && typeof c.properties === 'object') {
            const props = c.properties;
            const keys = Object.keys(props).sort();
            const questions = keys
              .map(k => props[k]?.description || props[k]?.title || props[k]?.example || props[k]?.const || k)
              .filter(q => typeof q === 'string' && q.trim().length > 0)
              .slice(0, 6);

            if (questions.length) return questions;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // Extrai texto "normal" da resposta
  const extractResponseText = (data: WebhookResponse): string => {
    if (data.output && typeof data.output === 'string') return data.output;
    if (data.response && typeof data.response === 'string') return data.response;
    if (data.message && typeof data.message === 'string') return data.message;
    if (data.content && typeof data.content === 'string') return data.content;
    if (data.text && typeof data.text === 'string') return data.text;
    if (data.result && typeof data.result === 'string') return data.result;
    if (data.data && typeof data.data === 'string') return data.data;
    if (data.data && typeof data.data === 'object' && data.data !== null) {
      const dataObj = data.data as Record<string, unknown>;
      if (typeof dataObj.response === 'string') return dataObj.response;
      if (typeof dataObj.message === 'string') return dataObj.message;
      if (typeof dataObj.text === 'string') return dataObj.text;
    }
    return JSON.stringify(data, null, 2);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const streamResponseAsSeparateMessages = async (fullText: string, model?: string) => {
    const chunks = fullText.split('\n\n').filter(c => c.trim() !== '');
    for (const chunk of chunks) {
      const messageId = (Date.now() + Math.random()).toString();
      const assistantMessage: Message = {
        id: messageId,
        content: "",
        type: 'assistant',
        timestamp: new Date(),
        model: model
      };
      setMessages(prev => [...prev, assistantMessage]);

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
      await sleep(1000);
    }
  };

  const handleFeedback = async (ratedMessage: Message, userQuestion: Message | undefined, rating: 'positive' | 'negative') => {
    if (!ratedMessage || ratedMessage.feedback) return;

    const payload = {
      question: userQuestion ? userQuestion.content : 'Contexto da pergunta não encontrado.',
      answer: ratedMessage.content,
      rating: rating,
      sessionId: sessionId,
      userId: currentUserId,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Webhook failed with status ${response.status}`);

      setMessages(prevMessages => prevMessages.map(m =>
        m.id === ratedMessage.id ? { ...m, feedback: rating } : m
      ));

      toast({ title: "Feedback enviado", description: "Obrigado pela sua avaliação!" });
    } catch (error) {
      console.error("Failed to send feedback:", error);
      toast({ title: "Erro", description: "Não foi possível enviar seu feedback. Tente novamente.", variant: "destructive" });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // digitou algo -> remover chips de sugestões para não confundir
    if (questionSuggestions.length) setQuestionSuggestions([]);

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

    if (fileInputRef.current) fileInputRef.current.value = "";

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Erro", description: "O arquivo é muito grande (máx 10MB).", variant: "destructive" });
      return;
    }
    setAttachedFile(file);
  };

  const handleSendMessage = async (event?: React.FormEvent | React.KeyboardEvent): Promise<void> => {
    if (event) event.preventDefault();

    if ((!message.trim() && !attachedFile) || isLoading || !sessionId || !currentUserId) return;

    // Verificar tokens antes de enviar
    if (!canSendMessage) {
      toast({
        title: "Tokens insuficientes",
        description: "Você não possui tokens disponíveis. Entre em contato com um administrador para recarregar.",
        variant: "destructive",
      });
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

    // Decrementar token (admins não gastam tokens, verificação interna no hook)
    const tokenDecremented = await decrementToken();
    if (!tokenDecremented && !hasUnlimitedTokens) {
      toast({
        title: "Erro ao processar token",
        description: "Não foi possível decrementar seu token. Tente novamente.",
        variant: "destructive",
      });
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
      return;
    }

    try {
      let response: Response;

      if (fileToSend) {
        const formData = new FormData();
        formData.append('file', fileToSend);
        formData.append('sessionId', sessionId);
        formData.append('userId', currentUserId);
        formData.append('type', fileToSend.type);
        formData.append('message', userMessageContent || `Arquivo enviado: ${fileToSend.name}`);
        formData.append('model', selectedModel || 'basic'); // Adicionar o modelo selecionado aqui
        formData.append('advancedCreativity', isAdvancedCreativity ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.' : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Não retorne listas, bullet points ou enumerações. Seja conciso e direto ao ponto.');

        response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const data: WebhookResponse = await response.json();

        // Sugestões?
        const suggestions = extractQuestionSuggestions(data);
        if (suggestions && suggestions.length) {
          setMessages(prev => [...prev, {
            id: (Date.now() + Math.random()).toString(),
            content: "Não encontrei uma resposta direta, selecione uma das sugestões abaixo",
            type: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          }]);
          setQuestionSuggestions(suggestions.slice(0, 3));
          setIsLoading(false);
          return;
        }

        let aiResponseContent = extractResponseText(data);
        if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
          aiResponseContent = "Recebi o arquivo, mas não consegui processá-lo.";
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponseContent,
          type: 'assistant',
          timestamp: new Date(),
          model: selectedModel
        };
        setMessages(prev => [...prev, assistantMessage]);

      } else {
        const payload = {
          message: userMessageContent,
          timestamp: userMessage.timestamp.toISOString(),
          messageId: userMessage.id,
          sessionId: sessionId,
          userId: currentUserId,
          type: 'text',
          model: selectedModel, // Adicionar o modelo selecionado aqui
          advancedCreativity: isAdvancedCreativity ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.' : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Não retorne listas, bullet points ou enumerações. Seja conciso e direto ao ponto.',
        };

        response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const data: WebhookResponse = await response.json();

        // Sugestões?
        const suggestions = extractQuestionSuggestions(data);
        if (suggestions && suggestions.length) {
          setMessages(prev => [...prev, {
            id: (Date.now() + Math.random()).toString(),
            content: "Não encontrei uma resposta direta, selecione uma das sugestões abaixo",
            type: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          }]);
          setQuestionSuggestions(suggestions.slice(0, 3));
          setIsLoading(false);
          return;
        }

        const aiResponseContent = extractResponseText(data);

        if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "Não recebi uma resposta válida do assistente.",
            type: 'assistant',
            timestamp: new Date(),
            model: selectedModel
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          await streamResponseAsSeparateMessages(aiResponseContent, selectedModel);
        }
      }

      if (isNewChat) {
        setIsNewChat(false);
        onNewChatStarted?.();
      }

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem ou processar resposta:', error);
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));

      let errorMessage = "Não foi possível obter a resposta do assistente. Tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (error.message.includes('HTTP')) {
          errorMessage = `Erro do servidor: ${error.message}`;
        }
      }
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar sugestão direto
  const handleSendSuggestion = async (q: string): Promise<void> => {
    if (isLoading || !sessionId || !currentUserId) return;

    // Verificar tokens antes de enviar
    if (!canSendMessage) {
      toast({
        title: "Tokens insuficientes",
        description: "Você não possui tokens disponíveis. Entre em contato com um administrador para recarregar.",
        variant: "destructive",
      });
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

    if (questionSuggestions.length) setQuestionSuggestions([]);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: q.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Decrementar token
    const tokenDecremented = await decrementToken();
    if (!tokenDecremented && !hasUnlimitedTokens) {
      toast({
        title: "Erro ao processar token",
        description: "Não foi possível decrementar seu token. Tente novamente.",
        variant: "destructive",
      });
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        message: userMessage.content,
        timestamp: userMessage.timestamp.toISOString(),
        messageId: userMessage.id,
        sessionId: sessionId,
        userId: currentUserId,
        type: 'text',
        model: selectedModel, // Adicionar o modelo selecionado aqui
        advancedCreativity: isAdvancedCreativity ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.' : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Não retorne listas, bullet points ou enumerações. Seja conciso e direto ao ponto.',
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

      const data: WebhookResponse = await response.json();

      const suggestions = extractQuestionSuggestions(data);
      if (suggestions && suggestions.length) {
        setMessages(prev => [...prev, {
          id: (Date.now() + Math.random()).toString(),
          content: "Não encontrei uma resposta direta, selecione uma das sugestões abaixo",
          type: 'assistant',
          timestamp: new Date(),
          model: selectedModel
        }]);
        setQuestionSuggestions(suggestions.slice(0, 3));
        return;
      }

      const aiResponseContent = extractResponseText(data);
      if (!aiResponseContent || aiResponseContent.trim() === '' || aiResponseContent === '{}') {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: "Não recebi uma resposta válida do assistente.",
          type: 'assistant',
          timestamp: new Date(),
          model: selectedModel
        }]);
      } else {
        await streamResponseAsSeparateMessages(aiResponseContent, selectedModel);
      }

      if (isNewChat) {
        setIsNewChat(false);
        onNewChatStarted?.();
      }
    } catch (error) {
      console.error('❌ Erro ao enviar sugestão:', error);
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));

      let errorMessage = "Não foi possível obter a resposta do assistente. Tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (error.message.includes('HTTP')) {
          errorMessage = `Erro do servidor: ${error.message}`;
        }
      }
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
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

  const formatModelName = (model?: string): string => {
    if (!model) return '';

    const modelNames: Record<string, string> = {
      'global': 'Global',
      'd&o': 'D&O',
      'rc-profissional': 'RC Profissional',
      'rc-geral': 'RC Geral',
    };

    return modelNames[model] || model;
  };

  return (
    <div className="flex-1 flex flex-col h-[100svh] relative">
      {messages.length > 0 ? (
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 sm:pb-28 md:pb-32">
          <div className="max-w-4xl w-full mx-auto space-y-4 sm:space-y-5 md:space-y-6 px-0">
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
              const showModel = msg.type === 'assistant' && msg.model && showAvatar;

              return (
                <div key={msg.id} className={`group flex items-start gap-3 sm:gap-4 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'assistant' && (
                    showAvatar ? (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <img src={expertaAvatarLogo} alt="AI" className="w-8 h-8 rounded-full" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0" />
                    )
                  )}

                  <div className={`flex-1 flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Exibir modelo usado apenas no primeiro bloco da resposta da IA */}
                    {showModel && (
                      <div className="text-[10px] text-muted-foreground mb-1 px-2 opacity-60">
                        Modelo: {formatModelName(msg.model)}
                      </div>
                    )}

                    <div className={`max-w-[85vw] sm:max-w-xl md:max-w-2xl break-words break-anywhere transition-transform duration-200 active:scale-[0.97] ${
                      msg.type === 'user'
                        ? 'bg-[#F5D5A8] text-gray-900 ml-8 sm:ml-12 rounded-2xl p-3 sm:p-4 shadow-sm'
                        : 'bg-white text-gray-900 border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm'
                    }`}>
                      {msg.file ? (
                        <div className="flex flex-col gap-2">
                          {msg.file.type.startsWith('image/') ? (
                            <img
                              src={msg.file.url}
                              alt={msg.file.name}
                              className="max-w-full sm:max-w-xs h-auto rounded-lg cursor-pointer" 
                              onClick={() => window.open(msg.file.url, '_blank')} 
                            />
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
                          {msg.content && <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap pt-2">{renderWithEmphasis(msg.content)}</p>}
                        </div>
                      ) : (
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{renderWithEmphasis(msg.content)}</p>
                      )}

                      {/* Horário - para usuário e assistente */}
                      {msg.type === 'user' && (
                        <p className="text-[10px] sm:text-xs mt-2 opacity-70 text-gray-700">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      {msg.type === 'assistant' && (
                        <p className="text-[10px] sm:text-xs mt-2 opacity-60 text-muted-foreground">
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
                          onClick={() => {
                            const userQuestion = messages.slice(0, index).reverse().find(m => m.type === 'user');
                            handleFeedback(msg, userQuestion, 'positive');
                          }}
                          disabled={!!msg.feedback}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 rounded-full ${msg.feedback === 'negative' ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                          onClick={() => {
                            const userQuestion = messages.slice(0, index).reverse().find(m => m.type === 'user');
                            handleFeedback(msg, userQuestion, 'negative');
                          }}
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
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-4 justify-start">
                <div className="animated-gradient-border-wrap rounded-full">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <img src={expertaAvatarLogo} alt="AI" className="w-8 h-8 rounded-full" />
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 mr-4 sm:mr-8 md:mr-12">
                  <div className="flex flex-col">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    {/* 🔥 frase dinâmica */}
                    {loadingBlurb && (
                      <div className="mt-2 text-xs italic text-muted-foreground/80 font-light">
                        {loadingBlurb}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-4 sm:px-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              {userName ? (
                <>
                  Olá <span className="animated-gradient-text font-semibold">{userName}</span>
                </>
              ) : (
                "Olá, sou Experta."
              )}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
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

      {/* ===== BARRA INFERIOR COM OVERLAY TRANSLÚCIDO ===== */}
      <div className="sticky bottom-0 z-30 relative">
        {/* overlay gradiente suave que permite ver as mensagens passando */}
        <div
          className="
            pointer-events-none absolute inset-x-0 bottom-0
            h-32 sm:h-36 md:h-40
            bg-gradient-to-t from-white/95 via-white/85 to-white/20
            backdrop-blur-md
            z-10
          "
        />

        {/* conteúdo da barra (fica por cima do overlay) */}
        <div
          className="
            relative z-20
            bg-transparent
            p-3 sm:p-4 md:p-6
            pb-[max(env(safe-area-inset-bottom),12px)]
          "
        >
          <div className="max-w-4xl w-full mx-auto">
            <div className="relative">

              {/* Chips de sugestões acima do input */}
              {questionSuggestions.length > 0 && (
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl p-2.5 sm:p-3 mb-2 sm:mb-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-2">
                    Não encontrei uma resposta adequada para essa pergunta, quer tentar:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {questionSuggestions.map((q, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="rounded-full hover:bg-primary/5 bg-white/90"
                        disabled={isLoading}
                        onClick={() => handleSendSuggestion(q)}
                      >
                        {q}
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground bg-white/90"
                      onClick={() => setQuestionSuggestions([])}
                      disabled={isLoading}
                    >
                      Ocultar
                    </Button>
                  </div>
                </div>
              )}

              {attachedFile && (
                <div className="bg-white/80 backdrop-blur-md border border-gray-200 border-b-0 rounded-t-2xl p-3 -mb-2 shadow-sm">
                  <div className="flex items-center justify-between bg-white/90 p-2 rounded-lg">
                    <div className="flex items-center gap-2 text-sm overflow-hidden">
                      <FileIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="font-medium truncate text-gray-900">{attachedFile.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
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

              <div className={`flex items-center gap-2 bg-white/70 backdrop-blur-md border border-gray-200 p-1.5 sm:p-2 shadow-lg transition-shadow ${attachedFile ? 'rounded-b-2xl' : 'rounded-full'}`}>
                <div className="relative w-full">
                  <Input
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      !canSendMessage
                        ? "Sem tokens disponíveis. Contate um administrador."
                        : messages.length >= MESSAGE_LIMIT
                        ? "Limite de mensagens atingido."
                        : "Pergunte alguma coisa"
                    }
                    className="flex-1 border-0 bg-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base text-gray-900"
                    disabled={isLoading || messages.length >= MESSAGE_LIMIT || !canSendMessage}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, application/pdf"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, application/pdf"
                  />
                  {showSuggestions && (
                    <ul className="absolute bottom-full mb-1 left-0 w-full max-h-48 sm:max-h-56 overflow-auto bg-white border border-gray-300 rounded shadow z-10 text-sm">
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
                    className="h-10 w-10 sm:h-8 sm:w-8 p-0 hover:bg-muted rounded-full"
                    onClick={handlePaperclipClick}
                    disabled={isLoading || messages.length >= MESSAGE_LIMIT}
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdvancedCreativity(!isAdvancedCreativity)}
                    className={`h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-full hover:bg-muted ${
                      isAdvancedCreativity ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    }`}>
                    <Wand2 className="w-4 h-4" />
                  </Button>

                  <Button
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && !attachedFile) || isLoading || !sessionId || messages.length >= MESSAGE_LIMIT}
                    size="sm"
                    className="h-10 w-10 sm:h-8 sm:w-8 p-0 bg-novo-chat hover:bg-novo-chat/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
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
                <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-2">
                  {messages.length >= MESSAGE_LIMIT
                    ? "Você atingiu o limite de mensagens. Por favor, inicie um novo chat."
                    : `${MESSAGE_LIMIT - messages.length} mensagens restantes neste chat.`
                  }
                </p>
              )}
            </div>

            <p className="text-[11px] sm:text-xs text-muted-foreground text-center mt-3 sm:mt-4">
              A IA pode cometer erros. Considere verificar informações importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

};

export default ChatInterface;
