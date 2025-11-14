#!/bin/bash

GREEN='\033[0;32m'
NC='\033[0m'

#######################################################

echo -e "\n\n${GREEN}"
echo " █████████      ███████         █████████"
echo "       ███      ███    ██       ███      "
echo "     ███        ███    ███      ███      "
echo "   ███          ███    ███      ███  ████"
echo " ███            ███    ██       ███    ██"
echo " █████████      ███████         █████████"
echo "\n"
echo "ESSE MATERIAL FAZ PARTE DA COMUNIDADE ZDG"
echo "\n"
echo "Compartilhar, vender ou fornecer essa solução"
echo "sem autorização é crime previsto no artigo 184"
echo "do código penal que descreve a conduta criminosa"
echo "de infringir os direitos autorais da ZDG."
echo "\n"
echo "PIRATEAR ESSA SOLUÇÃO É CRIME."
echo "\n"
echo " © COMUNIDADE ZDG - comunidadezdg.com.br"
echo -e "${NC}\n"

#######################################################

# Limpando containers e volumes existentes
echo "Limpando instalação anterior..."
echo "Parando e removendo containers existentes..."
docker-compose -f "n8n.yaml" down --remove-orphans || true

# Removendo a rede docker se existir
echo "Removendo rede docker..."
docker network rm comunidadezdg || true

# Gera senha aleatória para o PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 16)
echo "Senha do PostgreSQL gerada: $POSTGRES_PASSWORD"
echo ""

# Captura os subdomínios
read -p "💻 Subdomínio do n8n (ex: n8n.seudominio.com): " n8n_domain
echo ""
read -p "💻 Subdomínio do webhook n8n (ex: webhook.seudominio.com): " webhook_domain
echo ""
read -p "💻 Digite o email para configurar o certbot:" email
echo ""

# Exporta as variáveis de ambiente
export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"
export N8N_DOMAIN="$n8n_domain"
export WEBHOOK_DOMAIN="$webhook_domain"

# Verifica se os domínios estão configurados no DNS
echo "Verificando configuração DNS dos domínios..."
if ! dig +short $n8n_domain | grep -q '^[0-9]'; then
    echo "ERRO: O domínio $n8n_domain não está configurado no DNS"
    echo "Por favor, configure o DNS antes de continuar"
    exit 1
fi

if ! dig +short $webhook_domain | grep -q '^[0-9]'; then
    echo "ERRO: O domínio $webhook_domain não está configurado no DNS"
    echo "Por favor, configure o DNS antes de continuar"
    exit 1
fi

echo "DNS verificado com sucesso!"

# Atualizando a VPS e instalando dependências
echo "Atualizando a VPS + Instalando Dependências"
sudo apt update -y && sudo apt upgrade -y
sudo apt install nginx certbot python3-certbot-nginx dnsutils -y

# Captura o IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

# Configura os subdomínios no /etc/hosts
echo "$SERVER_IP $n8n_domain" | sudo tee -a /etc/hosts
echo "$SERVER_IP $webhook_domain" | sudo tee -a /etc/hosts

echo "Subdomínios configurados:"
echo "$n8n_domain -> $SERVER_IP"
echo "$webhook_domain -> $SERVER_IP"

# Configurando Nginx para proxy reverso
cat > /etc/nginx/sites-available/n8n << EOL
server {
  server_name $n8n_domain;
  location / {
    proxy_pass http://127.0.0.1:5678;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}

server {
  server_name $webhook_domain;
  location / {
    proxy_pass http://127.0.0.1:5680;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}
EOL

sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx

# Configurando o Certbot para SSL
sudo certbot --nginx --email $email --redirect --agree-tos --non-interactive -d $n8n_domain -d $webhook_domain

# Verifica se o arquivo YAML existe
if [ ! -f "n8n.yaml" ]; then
    echo "ERRO: Arquivo n8n.yaml não encontrado"
    echo "Certifique-se de que o arquivo está no diretório correto"
    exit 1
fi

# Função para substituir variáveis no arquivo YAML
substituir_variaveis_yaml() {
    echo "Substituindo variáveis no arquivo YAML..."
    sed -i "s|\${N8N_DOMAIN}|$n8n_domain|g" n8n.yaml
    sed -i "s|\${WEBHOOK_DOMAIN}|$webhook_domain|g" n8n.yaml
    sed -i "s|\${POSTGRES_PASSWORD}|$POSTGRES_PASSWORD|g" n8n.yaml
    echo "Variáveis substituídas com sucesso!"
}

# Chama a função para substituir as variáveis
substituir_variaveis_yaml

# Verificando e criando a rede docker se necessário
echo "Verificando rede docker..."
if ! docker network ls | grep -q "comunidadezdg"; then
    echo "Criando rede docker..."
    docker network create comunidadezdg || { echo "ERRO ao criar rede docker"; exit 1; }
else
    echo "Rede docker já existe"
fi

# Verifica e remove o volume de dados do PostgreSQL se existir
docker volume inspect n8n_postgres_data >/dev/null 2>&1 && docker volume rm n8n_postgres_data

# Verificando e criando os volumes se necessário
echo "Verificando volumes..."

# Função para criar volume
criar_volume() {
    local volume_name=$1
    echo "Criando volume $volume_name..."
    docker volume create "$volume_name" || { 
        echo "ERRO ao criar volume $volume_name"
        exit 1
    }
}

# Processo para n8n_postgres_data
echo "Processando volume n8n_postgres_data..."
criar_volume "n8n_postgres_data"

# Processo para n8n_redis_data
echo "Processando volume n8n_redis_data..."
criar_volume "n8n_redis_data"

# Verifica se o Docker está rodando
if ! systemctl is-active --quiet docker; then
    echo "Iniciando serviço Docker..."
    sudo systemctl start docker || { echo "ERRO ao iniciar o Docker"; exit 1; }
fi

# Executando o compose file
echo "Iniciando a configuração dos containers..."
docker-compose -f "n8n.yaml" up -d || { echo "ERRO ao configurar os containers"; exit 1; }

docker restart n8n_n8n_worker_1
sleep 2
docker restart n8n_n8n-redis_1
sleep 2
docker restart n8n_n8n_editor_1
sleep 2
docker restart n8n_n8n_webhook_1
sleep 2
docker restart n8n_n8n-postgres_1

echo "Configuração concluída com sucesso!"

echo -e "\n\n${GREEN}"
echo " █████████      ███████         █████████"
echo "       ███      ███    ██       ███      "
echo "     ███        ███    ███      ███      "
echo "   ███          ███    ███      ███  ████"
echo " ███            ███    ██       ███    ██"
echo " █████████      ███████         █████████"
echo "\n"
echo "ESSE MATERIAL FAZ PARTE DA COMUNIDADE ZDG"
echo "\n"
echo "Compartilhar, vender ou fornecer essa solução"
echo "sem autorização é crime previsto no artigo 184"
echo "do código penal que descreve a conduta criminosa"
echo "de infringir os direitos autorais da ZDG."
echo "\n"
echo "PIRATEAR ESSA SOLUÇÃO É CRIME."
echo "\n"
echo " © COMUNIDADE ZDG - comunidadezdg.com.br"
echo -e "${NC}\n"

echo -e "${GREEN}💻 Instalação N8N concluída com sucesso!${NC}"
echo ""
echo "URL do N8N: https://$n8n_domain"
echo "URL do Webhook: https://$webhook_domain"
echo ""
echo "Credenciais do PostgreSQL:"
echo "Usuário: postgres"
echo "Senha: $POSTGRES_PASSWORD"
echo "Banco de dados: n8n_comunidadezdg"
echo "Porta: 5434"
echo ""
echo "Credenciais do Redis:"
echo "Host: redis"
echo "Porta: 6380"
echo "Banco: 2"
echo ""
echo -e "${NC}"
sleep 2 