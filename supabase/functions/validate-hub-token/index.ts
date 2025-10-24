import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenPayload {
  token: string;
  user_id: string;
  user_email: string;
}

/**
 * Descriptografa o token usando AES-256-CBC
 * Replica a lógica do PHP: isw_decrypt()
 */
async function decryptToken(encryptedToken: string, key: string): Promise<string | null> {
  try {
    // 1. Substituir caracteres URL-safe de volta para base64 padrão
    const safeData = encryptedToken.replace(/-/g, '+').replace(/_/g, '/');

    // 2. Decodificar base64
    const decodedData = atob(safeData);

    // 3. Separar dados criptografados e IV
    const parts = decodedData.split(';');
    if (parts.length !== 2) {
      console.error('Token format invalid: missing IV separator');
      return null;
    }

    const [encryptedData, ivStr] = parts;

    // 4. Preparar IV (16 bytes para AES-256-CBC)
    const iv = new Uint8Array(16);
    const ivBytes = new TextEncoder().encode(ivStr);
    iv.set(ivBytes.slice(0, 16));

    // 5. Preparar chave (32 bytes para AES-256)
    const keyBytes = new TextEncoder().encode(key);
    const keyArray = new Uint8Array(32);
    keyArray.set(keyBytes.slice(0, 32));

    // 6. Importar chave para Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyArray,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    // 7. Decodificar dados criptografados de base64
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // 8. Descriptografar
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      cryptoKey,
      encryptedBytes
    );

    // 9. Converter para string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    return decryptedText;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Valida o token com o endpoint do Hub
 */
async function validateTokenWithHub(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://hub.vendaseguro.com.br/isw_api/isw_validar_usuario.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `token=${encodeURIComponent(token)}`,
    });

    const result = await response.text();
    return result.trim() === 'liberado';
  } catch (error) {
    console.error('Hub validation error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Received token for validation');

    // 1. Descriptografar o token
    const decrypted = await decryptToken(token, 'isw_venda_seguro');

    if (!decrypted) {
      console.error('Failed to decrypt token');
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token decrypted successfully');

    // 2. Extrair informações do token
    const parts = decrypted.split('|');
    if (parts.length !== 3) {
      console.error('Invalid token structure');
      return new Response(
        JSON.stringify({ error: 'Invalid token structure' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const [isw_token, user_id, user_email] = parts;
    console.log('Token parsed:', { user_id, user_email });

    // 3. Validar com o Hub
    const isValid = await validateTokenWithHub(token);

    if (!isValid) {
      console.error('Token validation failed with Hub');
      return new Response(
        JSON.stringify({ error: 'Token validation failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Token validated successfully with Hub');

    // 4. Verificar/criar usuário no Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se usuário existe
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user_email.toLowerCase())
      .single();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log('User already exists:', userId);
    } else {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user_email.toLowerCase(),
        password: Math.random().toString(36).slice(-12) + 'Aa1!', // Senha aleatória
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error('Failed to create user:', authError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = authData.user.id;
      console.log('User created:', userId);

      // Criar perfil
      await supabase.from('profiles').insert({
        id: userId,
        email: user_email.toLowerCase(),
        name: user_email.split('@')[0],
        role: 'default',
      });
    }

    // 5. Gerar sessão do Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user_email.toLowerCase(),
    });

    if (sessionError) {
      console.error('Failed to generate session:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Session generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: userId,
          email: user_email.toLowerCase(),
        },
        session_url: sessionData.properties.action_link,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
