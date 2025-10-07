

// Importa a função para criar o cliente Supabase
import { createClient } from '@supabase/supabase-js';

// --- INFORMAÇÕES DE CONEXÃO ---
// Altere estas variáveis para testar outras conexões
const supabaseUrl = 'https://supabase.vendaseguro.tech'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzU5MTE0ODAwLCJleHAiOjE5MTY4ODEyMDB9.qwETpJf9wXfGmh3E0SfLdg6xXnTK3cgWp_tkfnR5hKQ';
// --- FIM DAS INFORMAÇÕES DE CONEXÃO ---

// Cria o cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const channelName = 'online-users';
const channel = supabase.channel(channelName, {
  config: {
    presence: {
      key: `user-${Math.random().toString(36).substring(7)}`, // Gera uma chave de usuário aleatória
    },
  },
});

console.log(`Tentando se conectar ao canal: ${channelName}...`);

// Eventos de Presença
channel
  .on('presence', { event: 'sync' }, () => {
    console.log('Sincronização de presença recebida. Estado atual:', channel.presenceState());
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('Novo usuário entrou:', key, newPresences);
    console.log('Estado atual:', channel.presenceState());
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('Usuário saiu:', key, leftPresences);
    console.log('Estado atual:', channel.presenceState());
  });

// Eventos de Inscrição no Canal
channel.subscribe((status, err) => {
  if (status === 'SUBSCRIBED') {
    console.log(`\nConectado com sucesso ao canal "${channelName}"!`);
    console.log('Aguardando eventos de presença (join, leave, sync)...');
    console.log('Abra a aplicação em outra aba do navegador para ver os eventos de "join".\n');
    
    // Rastreia o próprio status para aparecer na lista de presença
    channel.track({ online_at: new Date().toISOString() });

  } else if (status === 'TIMED_OUT') {
    console.error('Tempo de conexão esgotado. Verifique a URL do Supabase e a conexão de rede.');
  } else if (status === 'CHANNEL_ERROR') {
    console.error('Erro no canal. Verifique a chave de API e as políticas de RLS (Row Level Security) no Supabase.');
    if (err) {
      console.error(err);
    }
  } else if (status === 'CLOSED') {
    console.log('Conexão com o canal foi fechada.');
  }
});

// Mantém o script rodando para escutar os eventos
setInterval(() => {}, 1000 * 60 * 60);

console.log('Script iniciado. Pressione Ctrl+C para sair.');
