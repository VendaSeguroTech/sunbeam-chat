import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Paperclip, Send, Sparkles, Search, User, File as FileIcon, X, ThumbsUp, ThumbsDown, Coins, Wand2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createPortal } from "react-dom";
import { useConversationHistory, ConversationHistory } from "@/hooks/useConversationHistory";
import { useN8nChatHistory } from "@/hooks/useN8nChatHistory";
import { useTokens } from "@/hooks/useTokens";
import { useModels } from "@/hooks/useModels";
import { supabase } from "@/supabase/client";
import { N8nChatMessage, Message, MessageContent } from "@/types/chat";
import expertaAvatarLogo from "@/assets/experta-avatar.avif";
import MarkdownRenderer from "./MarkdownRenderer";

interface ChatInterfaceProps {
  selectedConversation?: ConversationHistory | null;
  selectedSessionId?: string | null;
  onNewChatStarted?: () => void;
  selectedModel?: string;
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
  selectedModel
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

  // Sugestões do backend
  const [questionSuggestions, setQuestionSuggestions] = useState<string[]>([]);

  // Frases dinâmicas de loading
  const [loadingBlurb, setLoadingBlurb] = useState<string>("");
  const hasShownThabataOnceRef = useRef<boolean>(false);
  const lastTokenWarningShown = useRef<number>(0); // Rastreia o último aviso mostrado
  const hasCheckedInitialTokens = useRef<boolean>(false); // Flag para verificar tokens iniciais

  const { toast } = useToast();
  const { saveConversation, updateConversation, currentConversation } = useConversationHistory();
  const { fetchSessionMessages } = useN8nChatHistory();
  const { models } = useModels();
  const { tokens, hasUnlimitedTokens, canSendMessage, decrementToken, timeUntilReset, nextResetTime } = useTokens();

  //const WEBHOOK_URL = "https://webhook.vendaseguro.tech/webhook/0fc3496c-5dfa-4772-8661-da71da6353c7";
  const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MESSAGE_LIMIT = 40;

  const generateSessionId = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Formatar tempo até reset (ex: "2h 15min" ou "45min" ou "5min")
  const formatTimeUntilReset = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return "";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      return `${minutes}min`;
    } else {
      return "menos de 1min";
    }
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

        if (!profileError && profileData) {
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
    }
  }, [isInitialized]);

  // Carregar comandos
  useEffect(() => {
    setCommands(['/suporte', '/insert']);
  }, []);

  // Frases de loading
  useEffect(() => {
    let interval: number | undefined;
    if (isLoading) {
      hasShownThabataOnceRef.current = false;
      const basePhrases = ["pensando...", "realizando busca", "Já sei", "hmmm", "Estruturando a resposta..."];
      let i = 0;
      if (!hasShownThabataOnceRef.current) {
        setLoadingBlurb("o que a Thabata responderia?");
        hasShownThabataOnceRef.current = true;
        i = -1;
      } else {
        setLoadingBlurb(basePhrases[0]);
        i = 0;
      }
      interval = window.setInterval(() => {
        i = (i + 1) % basePhrases.length;
        setLoadingBlurb(basePhrases[i]);
      }, 3000);
    } else {
      setLoadingBlurb("");
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isLoading]);

  // Avisos progressivos de tokens baixos (5, 4, 3, 2, 1)
  useEffect(() => {
    // Verificar na primeira carga E quando tokens mudam
    const shouldShowWarning = !hasUnlimitedTokens &&
                               tokens >= 1 &&
                               tokens <= 5 &&
                               (!hasCheckedInitialTokens.current || lastTokenWarningShown.current !== tokens);

    if (shouldShowWarning) {
      // Marcar que já verificamos os tokens iniciais
      hasCheckedInitialTokens.current = true;
      lastTokenWarningShown.current = tokens;

      const resetInfo = timeUntilReset ? ` Seus tokens serão resetados em ${formatTimeUntilReset(timeUntilReset)}.` : '';

      // Definir título e emoji baseado na quantidade
      let title = "⚠️ Você está quase sem tokens!";
      let variant: "default" | "destructive" = "default";

      if (tokens === 1) {
        title = "🚨 ÚLTIMO TOKEN!";
        variant = "destructive";
      } else if (tokens === 2) {
        title = "⚠️ Apenas 2 tokens restantes!";
        variant = "destructive";
      }

      toast({
        title,
        description: `Você tem apenas ${tokens} ${tokens === 1 ? 'token disponível' : 'tokens disponíveis'}.${resetInfo}`,
        variant,
        duration: 6000,
      });
    }

    // Resetar o rastreador quando tokens aumentam (após reset)
    if (tokens > 5) {
      lastTokenWarningShown.current = 0;
      hasCheckedInitialTokens.current = false; // Permitir novo check após reset
    }
  }, [tokens, hasUnlimitedTokens, toast, timeUntilReset]);

  const convertN8nMessagesToLocal = useCallback((n8nMessages: N8nChatMessage[]): Message[] => {
    const localMessages: Message[] = [];
    n8nMessages.forEach((record, index) => {
      const message = record.message;
      let content = 'Mensagem sem conteúdo';
      let type: 'user' | 'assistant' = 'assistant';
      let fileInfo: { url: string; type: string; name: string } | undefined = undefined;

      // Primeiro: verificar se o arquivo está nas colunas do banco (file_url, file_name, file_type)
      // Apenas exibir como anexo se for PDF (não exibir para file_type: "text")
      if (record.file_type === 'application/pdf' && (record.file_name || record.file_url)) {
        fileInfo = {
          url: record.file_url || '#',
          type: record.file_type || 'application/pdf',
          name: record.file_name || 'Arquivo anexado'
        };
      }

      if (typeof message === 'string') {
        content = message;
        type = index % 2 === 0 ? 'user' : 'assistant';
      } else if (message && typeof message === 'object') {
        const messageObj = message as MessageContent;
        const suggestions = extractQuestionSuggestions(messageObj);

        // Segundo: detectar informações de arquivo dentro do objeto message (fallback)
        // Apenas exibir como anexo se for PDF (não exibir para file_type: "text")
        if (!fileInfo) {
          const hasFile = messageObj.hasFile === 'true' || messageObj.hasFile === true ||
                          messageObj.file || messageObj.fileName || messageObj.filename || messageObj.attachment;
          const fileType = (messageObj.fileType as string) || (messageObj.mimeType as string) || (messageObj.type as string) || 'application/pdf';

          if (hasFile && fileType === 'application/pdf') {
            fileInfo = {
              url: '#', // Não temos URL do arquivo no histórico
              type: fileType,
              name: (messageObj.fileName as string) || (messageObj.filename as string) || (messageObj.name as string) || 'Arquivo anexado'
            };
          }
        }

        if (suggestions && suggestions.length > 0) {
          const suggestionText = suggestions
            .map(q => `- ${q.replace(/^Pergunta \d+:\s*/, '')}`)
            .join('\n');
          content = `O assistente sugeriu as seguintes perguntas:\n${suggestionText}`;
          type = 'assistant';
        } else {
          content = extractResponseText(messageObj as WebhookResponse);
        }

        if (messageObj.type) {
          type = messageObj.type;
        } else {
          type = index % 2 === 0 ? 'user' : 'assistant';
        }

      } else {
        content = 'Mensagem vazia';
        type = index % 2 === 0 ? 'user' : 'assistant';
      }

      if (type === 'assistant' && content.includes('\n\n')) {
        const chunks = content.split('\n\n').filter(c => c.trim() !== '');
        chunks.forEach((chunk, chunkIndex) => {
          localMessages.push({
            id: `${record.id?.toString() || `msg_${index}`}_${chunkIndex}`,
            content: chunk.trim(),
            type,
            timestamp: new Date(record.created_at || new Date().toISOString()),
            model: record.model,
            ...(fileInfo && chunkIndex === 0 ? { file: fileInfo } : {})
          });
        });
      } else {
        localMessages.push({
          id: record.id?.toString() || `msg_${index}`,
          content: content.trim(),
          type,
          timestamp: new Date(record.created_at || new Date().toISOString()),
          model: record.model,
          ...(fileInfo ? { file: fileInfo } : {})
        });
      }
    });
    return localMessages;
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const loadConversation = async () => {
      if (selectedSessionId) {
        setIsLoading(true);
        try {
          const n8nMessages = await fetchSessionMessages(selectedSessionId);
          const converted = convertN8nMessagesToLocal(n8nMessages);
          setMessages(converted);
          setSessionId(selectedSessionId);
          setIsNewChat(false);
        } catch {
          toast({ title: "Erro", description: "Não foi possível carregar a conversa.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else if (selectedConversation) {
        setMessages(selectedConversation.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
        setIsNewChat(false);
      } else {
        setMessages([]);
        setIsNewChat(true);
      }
    };
    loadConversation();
  }, [selectedConversation, selectedSessionId, isInitialized]);

  // Portal do input fora do mask container
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "chat-input-portal";
    document.body.appendChild(el);
    setPortalEl(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  // ---- Anchor + cálculo da largura/posição do centro do chat
  const anchorRef = useRef<HTMLDivElement>(null);
  const [dockBox, setDockBox] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const updateDock = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setDockBox({ left: rect.left, width: rect.width });
    };
    updateDock();
    window.addEventListener("resize", updateDock);
    window.addEventListener("scroll", updateDock, true);
    const ro = new ResizeObserver(updateDock);
    if (anchorRef.current) ro.observe(anchorRef.current);
    return () => {
      window.removeEventListener("resize", updateDock);
      window.removeEventListener("scroll", updateDock, true);
      ro.disconnect();
    };
  }, []);

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

  const extractQuestionSuggestions = useCallback((raw: unknown): string[] | null => {
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
    } catch {}
    return null;
  }, []);

  const extractResponseText = useCallback((data: WebhookResponse): string => {
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
  }, []);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const streamResponseAsSeparateMessages = async (fullText: string, model?: string) => {
    let chunks = fullText.split('\n\n').filter(c => c.trim() !== '');

    // Se o primeiro bloco for curto (provavelmente um título), junte-o com o segundo.
    if (chunks.length > 1 && chunks[0].length < 80) {
      chunks[1] = chunks[0] + '\n\n' + chunks[1];
      chunks.shift(); // Remove o primeiro elemento (título)
    }

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
        if (delayPerCharacter > 0) await sleep(delayPerCharacter);
      }
      await sleep(1000);
    }
  };

  const handleFeedback = useCallback(async (ratedMessage: Message, userQuestion: Message | undefined, rating: 'positive' | 'negative') => {
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
      setMessages(prev => prev.map(m => (m.id === ratedMessage.id ? { ...m, feedback: rating } : m)));
      toast({ title: "Feedback enviado", description: "Obrigado pela sua avaliação!" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar seu feedback. Tente novamente.", variant: "destructive" });
    }
  }, [sessionId, currentUserId, WEBHOOK_URL, toast]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." });
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar o conteúdo.", variant: "destructive" });
    }
  }, [toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
  }, [questionSuggestions.length, commands]);

  const handleSendMessage = useCallback(async (event?: React.FormEvent | React.KeyboardEvent): Promise<void> => {
    if (event) event.preventDefault();
    if ((!message.trim() && !attachedFile) || isLoading || !sessionId || !currentUserId) return;

    if (!canSendMessage) {
      const resetInfo = timeUntilReset ? ` Seus tokens serão resetados em ${formatTimeUntilReset(timeUntilReset)}.` : ' Entre em contato com um administrador para recarregar.';
      toast({ title: "Tokens insuficientes", description: `Você não possui tokens disponíveis.${resetInfo}`, variant: "destructive" });
      return;
    }

    if (messages.length >= MESSAGE_LIMIT) {
      toast({ title: "Limite de mensagens atingido", description: "Por favor, inicie um novo chat para continuar.", variant: "destructive" });
      return;
    }

    // Validar se usuário tem permissão para usar o modelo selecionado
    const selectedModelObj = models.find(m => m.name === selectedModel);
    if (!selectedModelObj) {
      toast({
        title: "Modelo não disponível",
        description: "Você não tem permissão para usar este modelo.",
        variant: "destructive"
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
      file: fileToSend ? { url: URL.createObjectURL(fileToSend), type: fileToSend.type, name: fileToSend.name } : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setAttachedFile(null);
    setIsLoading(true);

    const tokenDecremented = await decrementToken();
    if (!tokenDecremented && !hasUnlimitedTokens) {
      toast({ title: "Erro ao processar token", description: "Não foi possível decrementar seu token. Tente novamente.", variant: "destructive" });
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
        formData.append('model', selectedModel || 'basic');
        formData.append('fileName', fileToSend.name);
        formData.append('fileType', fileToSend.type);
        formData.append('hasFile', 'true');
        formData.append('advancedCreativity', isAdvancedCreativity
          ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.'
          : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Se solicitado, retorne a resposta levemente formatada com Bullets, listas ou tópicos. Seja conciso e direto ao ponto.'
        );

        response = await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
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
          model: selectedModel,
          advancedCreativity: isAdvancedCreativity
            ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.'
            : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Se solicitado, retorne a resposta levemente formatada com Bullets, listas ou tópicos. Seja conciso e direto ao ponto.',
        };

        response = await fetch(WEBHOOK_URL, {
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
          setIsLoading(false);
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
      }

      if (isNewChat) {
        setIsNewChat(false);
        onNewChatStarted?.();
      }

    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      let errorMessage = "Não foi possível obter a resposta do assistente. Tente novamente.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        else if (error.message.includes('HTTP')) errorMessage = `Erro do servidor: ${error.message}`;
      }
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [message, attachedFile, isLoading, sessionId, currentUserId, canSendMessage, messages.length, MESSAGE_LIMIT, toast, decrementToken, hasUnlimitedTokens, WEBHOOK_URL, selectedModel, isAdvancedCreativity, extractQuestionSuggestions, extractResponseText, isNewChat, onNewChatStarted]);

  const selectSuggestion = useCallback((command: string) => {
    const words = message.split(' ');
    words[words.length - 1] = command;
    setMessage(words.join(' '));
    setShowSuggestions(false);
  }, [message]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
  }, [showSuggestions, filteredCommands, selectedSuggestionIndex, selectSuggestion, handleSendMessage]);

  const handlePaperclipClick = () => {
    if (messages.length >= MESSAGE_LIMIT) {
      toast({ title: "Limite de mensagens atingido", description: "Você não pode enviar arquivos quando o limite de mensagens é atingido.", variant: "destructive" });
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


  // Enviar sugestão
  const handleSendSuggestion = useCallback(async (q: string): Promise<void> => {
    if (isLoading || !sessionId || !currentUserId) return;
    if (!canSendMessage) {
      const resetInfo = timeUntilReset ? ` Seus tokens serão resetados em ${formatTimeUntilReset(timeUntilReset)}.` : ' Entre em contato com um administrador para recarregar.';
      toast({ title: "Tokens insuficientes", description: `Você não possui tokens disponíveis.${resetInfo}`, variant: "destructive" });
      return;
    }
    if (messages.length >= MESSAGE_LIMIT) {
      toast({ title: "Limite de mensagens atingido", description: "Por favor, inicie um novo chat para continuar.", variant: "destructive" });
      return;
    }
    if (questionSuggestions.length) setQuestionSuggestions([]);

    const userMessage: Message = { id: Date.now().toString(), content: q.trim(), type: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    const tokenDecremented = await decrementToken();
    if (!tokenDecremented && !hasUnlimitedTokens) {
      toast({ title: "Erro ao processar token", description: "Não foi possível decrementar seu token. Tente novamente.", variant: "destructive" });
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
        model: selectedModel,
        advancedCreativity: isAdvancedCreativity
          ? 'Resposta completa e bem estruturada. Tamanho da resposta pode ser grande. Liste todos os detalhes, exemplos e explicações relevantes de forma aprofundada.'
          : 'Resposta objetiva e direta, bem enxuta e resumida para um leigo. Não gere respostas grandes, resuma o máximo que der. Se solicitado, retorne a resposta levemente formatada com Bullets, listas ou tópicos. Seja conciso e direto ao ponto.',
      };

      const response = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
    } catch {
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
      toast({ title: "Erro", description: "Não foi possível obter a resposta do assistente. Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, currentUserId, canSendMessage, toast, decrementToken, hasUnlimitedTokens, WEBHOOK_URL, selectedModel, isAdvancedCreativity, extractQuestionSuggestions, extractResponseText, isNewChat, onNewChatStarted]);

  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Títulos (## Título)
      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-900">
            {renderInlineMarkdown(line.slice(3))}
          </h2>
        );
        i++;
        continue;
      }

      // Títulos (# Título)
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-900">
            {renderInlineMarkdown(line.slice(2))}
          </h1>
        );
        i++;
        continue;
      }

      // Listas (- item ou * item)
      if (line.match(/^[-*]\s/)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().match(/^[-*]\s/)) {
          const itemText = lines[i].trim().slice(2);
          listItems.push(
            <li key={i} className="ml-4 mb-1">
              {renderInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ul key={`list-${i}`} className="list-disc list-inside my-2 space-y-1">
            {listItems}
          </ul>
        );
        continue;
      }

      // Listas numeradas (1. item)
      if (line.match(/^\d+\.\s/)) {
        const listItems: React.ReactNode[] = [];
        while (i < lines.length && lines[i].trim().match(/^\d+\.\s/)) {
          const itemText = lines[i].trim().replace(/^\d+\.\s/, '');
          listItems.push(
            <li key={i} className="ml-4 mb-1">
              {renderInlineMarkdown(itemText)}
            </li>
          );
          i++;
        }
        elements.push(
          <ol key={`list-${i}`} className="list-decimal list-inside my-2 space-y-1">
            {listItems}
          </ol>
        );
        continue;
      }

      // Linha vazia
      if (line === '') {
        elements.push(<br key={i} />);
        i++;
        continue;
      }

      // Parágrafo normal
      elements.push(
        <p key={i} className="my-1">
          {renderInlineMarkdown(line)}
        </p>
      );
      i++;
    }

    return <div className="markdown-content">{elements}</div>;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Negrito (**texto**)
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Adiciona o texto antes do match
      if (match.index > lastIndex) {
        result.push(text.substring(lastIndex, match.index));
      }
      // Adiciona o negrito
      result.push(<strong key={match.index} className="font-bold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    // Adiciona o texto restante
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }

    // Se não houver nenhum match, retorna o texto original
    return result.length > 0 ? result : text;
  };

  const renderWithEmphasis = (text: string) => {
    return renderMarkdown(text);
  };

  const renderAssistantMessage = (text: string) => {
    return renderMarkdown(text);
  };

  const formatModelName = (modelName?: string): string => {
    if (!modelName) return '';

    // Buscar o display_name do modelo no banco de dados
    const model = models.find(m => m.name === modelName);
    return model?.display_name || modelName;
  };

  const getFirstName = (fullName: string): string => {
    return fullName.split(' ')[0];
  };

  return (
    <TooltipProvider>
      {/* ANCHOR centralizado (segue as mesmas larguras do chat) */}
      <div ref={anchorRef} className="max-w-4xl w-full mx-auto px-4 sm:px-6 md:px-8 h-0" aria-hidden />

      {/* ===== CONTEÚDO PRINCIPAL (dentro do container com mask) ===== */}
      <div className="flex-1 flex flex-col h-[100svh] relative">
        {messages.length > 0 ? (
          <div
            className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 pb-[calc(120px+max(env(safe-area-inset-bottom),12px))]"
            style={{
              maskImage: 'linear-gradient(to bottom, black 99%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 99%, transparent 100%)'
            }}
          >
            <div className="max-w-4xl w-full mx-auto space-y-1 sm:space-y-2 md:space-y-3 px-0">
              {(isNewChat && messages.length > 0) || selectedSessionId ? (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {selectedSessionId ? `Sessão carregada • ${selectedSessionId.slice(-8)}` : `Nova conversa iniciada • SessionID: ${sessionId.slice(-8)}`}
                  </span>
                </div>
              ) : null}

              {messages.map((msg, index) => {
                const showAvatar = msg.type === "assistant" && (index === 0 || messages[index - 1]?.type !== "assistant");
                const showModel = msg.type === "assistant" && msg.model && showAvatar;
                return (
                  <div key={msg.id} className={`group flex items-start gap-3 sm:gap-4 ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.type === "assistant" && (showAvatar ? (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <img src={expertaAvatarLogo} alt="AI" className="w-8 h-8 rounded-full" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 flex-shrink-0" />
                    ))}

                    <div className={`flex-1 flex flex-col ${msg.type === "user" ? "items-end" : "items-start"}`}>
                      {showModel && (
                        <div className="text-[10px] text-muted-foreground mb-0.5 px-2 opacity-60">Modelo: {formatModelName(msg.model)}</div>
                      )}

                      <div className={`max-w-[85vw] sm:max-w-xl md:max-w-3xl break-words break-anywhere transition-transform duration-200 active:scale-[0.97] ${
                        msg.type === "user"
                          ? "bg-[#f5f5f7] text-gray-800 ml-8 sm:ml-12 rounded-2xl p-3 sm:p-4 shadow-sm"
                          : "bg-white text-gray-900 rounded-2xl p-3 sm:p-4 shadow-sm"
                      }`}>
                        {msg.file ? (
                          <div className="flex flex-col gap-2">
                            {msg.file.type.startsWith("image/") && msg.file.url !== '#' ? (
                              <img src={msg.file.url} alt={msg.file.name} className="max-w-full sm:max-w-xs h-auto rounded-lg cursor-pointer" onClick={() => window.open(msg.file.url, "_blank")} />
                            ) : msg.file.url !== '#' ? (
                              <a href={msg.file.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-lg ${msg.type === "user" ? "bg-black/10 hover:bg-black/20" : "bg-primary/10 hover:bg-primary/20"}`}>
                                <FileIcon className={`w-6 h-6 flex-shrink-0 ${msg.type === "user" ? "text-gray-700" : "text-primary"}`} />
                                <div className="flex flex-col overflow-hidden">
                                  <span className={`text-xs font-bold ${msg.type === "user" ? "text-black" : "text-muted-foreground"}`}>Anexo</span>
                                  <span className={`text-sm font-medium truncate ${msg.type === "user" ? "text-black" : "text-primary"}`}>{msg.file.name}</span>
                                </div>
                              </a>
                            ) : (
                              <div className={`flex items-center gap-3 p-3 rounded-lg ${msg.type === "user" ? "bg-black/10" : "bg-primary/10"}`}>
                                <FileIcon className={`w-6 h-6 flex-shrink-0 ${msg.type === "user" ? "text-gray-700" : "text-primary"}`} />
                                <div className="flex flex-col overflow-hidden">
                                  <span className={`text-xs font-bold ${msg.type === "user" ? "text-black" : "text-muted-foreground"}`}>Anexo</span>
                                  <span className={`text-sm font-medium truncate ${msg.type === "user" ? "text-black" : "text-primary"}`}>{msg.file.name}</span>
                                </div>
                              </div>
                            )}
                            {msg.content && <div className="text-[13px] md:text-[15px] font-medium leading-relaxed whitespace-pre-wrap pt-2"><MarkdownRenderer text={msg.content} /></div>}
                          </div>
                        ) : (
                          <div className="text-[13px] md:text-[15px] font-normal leading-relaxed whitespace-pre-wrap"><MarkdownRenderer text={msg.content} /></div>
                        )}

                        {msg.type === "user" && (
                          <p className="text-[10px] sm:text-xs mt-1 opacity-70 text-gray-700">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {msg.type === "assistant" && (
                          <p className="text-[10px] sm:text-xs mt-1 opacity-60 text-muted-foreground">
                            {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>

                      {msg.type === "assistant" && msg.content && (
                        <div className="flex items-center gap-1 mt-1 pl-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted"
                            onClick={() => handleCopy(msg.content)}>
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${msg.feedback === "positive" ? "text-green-500 bg-green-500/10" : "text-muted-foreground hover:bg-muted"}`}
                            onClick={() => { const userQuestion = messages.slice(0, index).reverse().find(m => m.type === "user"); handleFeedback(msg, userQuestion, "positive"); }}
                            disabled={!!msg.feedback}>
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${msg.feedback === "negative" ? "text-red-500 bg-red-500/10" : "text-muted-foreground hover:bg-muted"}`}
                            onClick={() => { const userQuestion = messages.slice(0, index).reverse().find(m => m.type === "user"); handleFeedback(msg, userQuestion, "negative"); }}
                            disabled={!!msg.feedback}>
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {msg.type === "user" && (
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
                  <div className="bg-white rounded-2xl p-3 sm:p-4 mr-4 sm:mr-8 md:mr-12 shadow-sm">
                    <div className="flex flex-col">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary/50 rounded-full loading-dot" />
                        <div className="w-2 h-2 bg-primary rounded-full loading-dot loading-dot-2" />
                        <div className="w-2 h-2 bg-primary/70 rounded-full loading-dot loading-dot-3" />
                      </div>
                      {loadingBlurb && (
                        <div className="mt-3 flex flex-col items-center">
                          <div className="text-xs italic text-muted-foreground/80 font-light">{loadingBlurb}</div>
                          <div className="w-24 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mt-1.5" />
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
          <div className="flex-1 flex items-center justify-center pb-[calc(120px+max(env(safe-area-inset-bottom),12px))]">
            <div className="text-center max-w-2xl mx-auto px-4 sm:px-6">
              <h1 className="text-2xl sm:text-3xl font-medium text-foreground ">
                {userName ? <>Olá <span className="animated-gradient-text font-medium ">{getFirstName(userName)}</span></> : <>Olá, sou a <span className="animated-gradient-text font-medium ">Experta.</span></>}
              </h1>
              <p className="text-base font-light sm:text-lg text-muted-foreground">Como posso ajudá-lo hoje?</p>
              {sessionId && <p className="text-xs text-muted-foreground mt-4 opacity-30">ID da sessão: {sessionId.slice(-8)}</p>}
            </div>
          </div>
        )}
      </div>

      {/* ===== BARRA INFERIOR — FORA DA MÁSCARA, VIA PORTAL ===== */}
      {portalEl && createPortal(
        <div
          className="fixed bottom-0 z-[1000] pointer-events-none"
          style={{ left: dockBox.left, width: dockBox.width }}
        >
          {/* sem mx-auto aqui; usamos os mesmos paddings do centro */}
          <div className="pointer-events-auto pb-[max(env(safe-area-inset-bottom),12px)] px-4 sm:px-6 md:px-8">
            <div className="relative">
              {/* Chips de sugestões */}
              {questionSuggestions.length > 0 && (
                <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl p-2.5 sm:p-3 mb-2 sm:mb-3 shadow-sm">
                  <p className="text-xs text-muted-foreground mb-2">Não encontrei uma resposta adequada para essa pergunta, quer tentar:</p>
                  <div className="flex flex-wrap gap-2">
                    {questionSuggestions.map((q, i) => (
                      <Button key={i} variant="outline" size="sm" className="rounded-full hover:bg-primary/5 bg-white" disabled={isLoading} onClick={() => handleSendSuggestion(q)}>
                        {q}
                      </Button>
                    ))}
                    <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={() => setQuestionSuggestions([])} disabled={isLoading}>
                      Ocultar
                    </Button>
                  </div>
                </div>
              )}

              {/* Preview de anexo */}
              {attachedFile && (
                <div className="bg-white/95 backdrop-blur-md border border-gray-200 border-b-0 rounded-t-2xl p-3 -mb-2 shadow-sm">
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg">
                    <div className="flex items-center gap-2 text-sm overflow-hidden">
                      <FileIcon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <span className="font-medium truncate text-gray-900">{attachedFile.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">({(attachedFile.size / 1024).toFixed(2)} KB)</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full flex-shrink-0" onClick={() => setAttachedFile(null)} disabled={isLoading}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Caixa de input */}
              <div className={`flex items-center gap-2 bg-white border border-gray-200 p-1.5 sm:p-2 shadow-lg ${attachedFile ? "rounded-b-2xl" : "rounded-full"}`}>
                <div className="relative w-full">
                  <Input
                    value={message}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      !canSendMessage
                        ? (timeUntilReset ? `Sem tokens. Reset em ${formatTimeUntilReset(timeUntilReset)}` : "Sem tokens disponíveis. Contate um administrador.")
                        : messages.length >= MESSAGE_LIMIT ? "Limite de mensagens atingido."
                        : "Pergunte alguma coisa"
                    }
                    className="flex-1 border-0 bg-white placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 text-base text-gray-900"
                    disabled={isLoading || messages.length >= MESSAGE_LIMIT || !canSendMessage}
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/png, image/jpeg, image/gif, application/pdf" />

                  {showSuggestions && (
                    <ul className="absolute bottom-full mb-1 left-0 w-full max-h-48 sm:max-h-56 overflow-auto bg-white border border-gray-300 rounded shadow z-10 text-sm">
                      {filteredCommands.map((cmd, index) => (
                        <li
                          key={cmd}
                          className={`px-3 py-1 cursor-pointer hover:bg-gray-200 ${index === selectedSuggestionIndex ? "bg-gray-300" : ""}`}
                          onMouseDown={(e) => { e.preventDefault(); selectSuggestion(cmd); }}
                        >
                          {cmd}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 md:h-10 md:w-10 p-0 hover:bg-muted rounded-full" onClick={handlePaperclipClick} disabled={isLoading || messages.length >= MESSAGE_LIMIT}>
                    <Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                  </Button>

                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setIsAdvancedCreativity(!isAdvancedCreativity)} className={`h-8 w-8 md:h-10 md:w-10 p-0 rounded-full hover:bg-muted ${isAdvancedCreativity ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        <Wand2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="animated-gradient-bg border-0 text-white font-medium shadow-lg">
                      <p>Modo Experta</p>
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && !attachedFile) || isLoading || !sessionId || messages.length >= MESSAGE_LIMIT}
                    size="sm"
                    className="h-8 w-8 md:h-10 md:w-10 p-0 bg-novo-chat hover:bg-novo-chat/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-full"
                  >
                    {isLoading ? <div className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-foreground" />}
                  </Button>
                </div>
              </div>

              {/* Aviso abaixo do input */}
              <p className="text-[11px] sm:text-xs text-zinc-400 text-center mt-3 sm:mt-4 font-light">
                A IA pode cometer erros. Considere verificar informações importantes.
              </p>
            </div>
          </div>
        </div>,
        portalEl
      )}
    </TooltipProvider>
  );
};

export default ChatInterface;