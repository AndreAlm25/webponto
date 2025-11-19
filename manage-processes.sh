#!/bin/bash

# Script de gerenciamento de processos do WebPonto
# Permite visualizar e controlar todos os processos relacionados ao projeto

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Função para exibir cabeçalho
show_header() {
    clear
    echo -e "${BLUE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}${BOLD}║         WebPonto - Gerenciador de Processos               ║${NC}"
    echo -e "${BLUE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Função para listar processos do WebPonto
list_processes() {
    echo -e "${CYAN}${BOLD}📋 Processos ativos do WebPonto:${NC}\n"
    
    # Array para armazenar PIDs e descrições
    declare -a PIDS
    declare -a DESCS
    declare -a PORTS
    local index=1
    
    # Next.js (Frontend)
    while IFS= read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        port=$(lsof -p "$pid" 2>/dev/null | grep LISTEN | grep -oP ':\K[0-9]+' | head -1)
        if [ -n "$pid" ]; then
            PIDS[$index]=$pid
            DESCS[$index]="Next.js Frontend"
            PORTS[$index]=${port:-"N/A"}
            echo -e "${GREEN}[$index]${NC} ${BOLD}Next.js Frontend${NC}"
            echo -e "    PID: ${YELLOW}$pid${NC} | Porta: ${PURPLE}${port:-"N/A"}${NC}"
            echo -e "    Comando: $(ps -p $pid -o cmd= | cut -c1-60)..."
            echo ""
            ((index++))
        fi
    done < <(ps aux | grep "next dev" | grep -v grep)
    
    # Nest.js (Backend)
    while IFS= read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        port=$(lsof -p "$pid" 2>/dev/null | grep LISTEN | grep -oP ':\K[0-9]+' | head -1)
        if [ -n "$pid" ]; then
            PIDS[$index]=$pid
            DESCS[$index]="Nest.js Backend"
            PORTS[$index]=${port:-"4000"}
            echo -e "${GREEN}[$index]${NC} ${BOLD}Nest.js Backend${NC}"
            echo -e "    PID: ${YELLOW}$pid${NC} | Porta: ${PURPLE}${port:-"4000"}${NC}"
            echo -e "    Comando: $(ps -p $pid -o cmd= | cut -c1-60)..."
            echo ""
            ((index++))
        fi
    done < <(ps aux | grep "nest start" | grep -v grep)
    
    # Prisma Studio
    while IFS= read -r line; do
        pid=$(echo "$line" | awk '{print $2}')
        port=$(lsof -p "$pid" 2>/dev/null | grep LISTEN | grep -oP ':\K[0-9]+' | head -1)
        if [ -n "$pid" ]; then
            PIDS[$index]=$pid
            DESCS[$index]="Prisma Studio"
            PORTS[$index]=${port:-"5555"}
            echo -e "${GREEN}[$index]${NC} ${BOLD}Prisma Studio${NC}"
            echo -e "    PID: ${YELLOW}$pid${NC} | Porta: ${PURPLE}${port:-"5555"}${NC}"
            echo -e "    Comando: $(ps -p $pid -o cmd= | cut -c1-60)..."
            echo ""
            ((index++))
        fi
    done < <(ps aux | grep "prisma studio" | grep -v grep)
    
    # Docker Containers
    if command -v docker &> /dev/null; then
        while IFS= read -r line; do
            container_id=$(echo "$line" | awk '{print $1}')
            container_name=$(echo "$line" | awk '{print $2}')
            container_ports=$(echo "$line" | awk '{print $3}')
            if [ -n "$container_id" ] && [ "$container_id" != "CONTAINER" ]; then
                PIDS[$index]="docker:$container_id"
                DESCS[$index]="Docker: $container_name"
                PORTS[$index]="$container_ports"
                echo -e "${GREEN}[$index]${NC} ${BOLD}Docker Container${NC}"
                echo -e "    Nome: ${CYAN}$container_name${NC} | Portas: ${PURPLE}$container_ports${NC}"
                echo -e "    ID: ${YELLOW}${container_id:0:12}${NC}"
                echo ""
                ((index++))
            fi
        done < <(docker ps --filter "name=webponto" --format "{{.ID}} {{.Names}} {{.Ports}}" 2>/dev/null)
    fi
    
    # Se não houver processos
    if [ $index -eq 1 ]; then
        echo -e "${YELLOW}⚠️  Nenhum processo do WebPonto encontrado${NC}\n"
        return 1
    fi
    
    # Salvar arrays em arquivos temporários para preservar os dados
    local temp_dir="/tmp/webponto_pm_$$"
    mkdir -p "$temp_dir"
    
    # Salvar cada entrada em arquivo separado
    for i in $(seq 1 $((index - 1))); do
        echo "${PIDS[$i]}" > "$temp_dir/pid_$i"
        echo "${DESCS[$i]}" > "$temp_dir/desc_$i"
        echo "${PORTS[$i]}" > "$temp_dir/port_$i"
    done
    
    echo $((index - 1)) > "$temp_dir/count"
    echo "$temp_dir" > /tmp/webponto_pm_dir
    
    return 0
}

# Função para matar processo específico
kill_process() {
    local choice=$1
    local temp_dir=$(cat /tmp/webponto_pm_dir 2>/dev/null)
    
    if [ -z "$temp_dir" ] || [ ! -d "$temp_dir" ]; then
        echo -e "${RED}❌ Erro ao acessar dados dos processos!${NC}"
        return 1
    fi
    
    local count=$(cat "$temp_dir/count" 2>/dev/null)
    
    if [ "$choice" -lt 1 ] || [ "$choice" -gt "$count" ]; then
        echo -e "${RED}❌ Opção inválida!${NC}"
        return 1
    fi
    
    local pid=$(cat "$temp_dir/pid_$choice" 2>/dev/null)
    local desc=$(cat "$temp_dir/desc_$choice" 2>/dev/null)
    
    if [ -z "$pid" ]; then
        echo -e "${RED}❌ Processo não encontrado!${NC}"
        return 1
    fi
    
    # Verificar se é container Docker
    if [[ $pid == docker:* ]]; then
        container_id="${pid#docker:}"
        echo -e "${YELLOW}🐳 Parando container Docker: $desc${NC}"
        docker stop "$container_id" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Container parado com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao parar container${NC}"
        fi
    else
        echo -e "${YELLOW}🔪 Matando processo: $desc (PID: $pid)${NC}"
        kill -9 "$pid" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Processo finalizado com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao finalizar processo${NC}"
        fi
    fi
    
    sleep 1
}

# Função para matar todos os processos
kill_all() {
    echo -e "${RED}${BOLD}⚠️  ATENÇÃO: Isso vai parar TODOS os processos do WebPonto!${NC}"
    read -p "Tem certeza? (s/N): " confirm
    
    if [[ $confirm =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}🔪 Parando todos os processos...${NC}\n"
        
        # Matar processos Node.js
        pkill -9 -f "next dev" 2>/dev/null && echo -e "${GREEN}✓${NC} Next.js parado"
        pkill -9 -f "nest start" 2>/dev/null && echo -e "${GREEN}✓${NC} Nest.js parado"
        pkill -9 -f "prisma studio" 2>/dev/null && echo -e "${GREEN}✓${NC} Prisma Studio parado"
        
        # Parar containers Docker
        if command -v docker &> /dev/null; then
            docker ps --filter "name=webponto" -q | xargs -r docker stop 2>/dev/null && echo -e "${GREEN}✓${NC} Containers Docker parados"
        fi
        
        echo -e "\n${GREEN}✅ Todos os processos foram parados!${NC}"
        sleep 2
    else
        echo -e "${CYAN}Operação cancelada${NC}"
        sleep 1
    fi
}

# Função para verificar portas em uso
check_ports() {
    echo -e "${CYAN}${BOLD}🔍 Verificando portas do WebPonto:${NC}\n"
    
    local ports=(3000 3001 3002 4000 5555 5432 6379 8080 9000 9001)
    
    for port in "${ports[@]}"; do
        local process=$(lsof -i :$port 2>/dev/null | grep LISTEN | head -1)
        if [ -n "$process" ]; then
            local pid=$(echo "$process" | awk '{print $2}')
            local cmd=$(echo "$process" | awk '{print $1}')
            echo -e "${YELLOW}Porta $port:${NC} ${RED}EM USO${NC} - PID: $pid ($cmd)"
        else
            echo -e "${YELLOW}Porta $port:${NC} ${GREEN}LIVRE${NC}"
        fi
    done
    
    echo ""
    read -p "Pressione ENTER para continuar..."
}

# Função para iniciar serviços
start_services() {
    echo -e "${CYAN}${BOLD}🚀 Iniciando serviços do WebPonto${NC}\n"
    echo "Escolha o que deseja iniciar:"
    echo -e "${GREEN}[1]${NC} Tudo (run-all.sh)"
    echo -e "${GREEN}[2]${NC} Apenas Frontend (Next.js)"
    echo -e "${GREEN}[3]${NC} Apenas Backend (Nest.js)"
    echo -e "${GREEN}[4]${NC} Apenas Prisma Studio"
    echo -e "${GREEN}[5]${NC} Docker Containers"
    echo -e "${GREEN}[0]${NC} Voltar"
    echo ""
    read -p "Escolha uma opção: " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Iniciando todos os serviços...${NC}"
            cd /root/Apps/webponto && ./run-all.sh
            ;;
        2)
            echo -e "${YELLOW}Iniciando Frontend...${NC}"
            cd /root/Apps/webponto/frontend && npm run dev &
            sleep 2
            ;;
        3)
            echo -e "${YELLOW}Iniciando Backend...${NC}"
            cd /root/Apps/webponto/backend && npm run start:dev &
            sleep 2
            ;;
        4)
            echo -e "${YELLOW}Iniciando Prisma Studio...${NC}"
            cd /root/Apps/webponto/backend && npm run prisma:studio &
            sleep 2
            ;;
        5)
            echo -e "${YELLOW}Iniciando Docker Containers...${NC}"
            cd /root/Apps/webponto && docker-compose -f docker-compose.dev.yml up -d
            sleep 2
            ;;
        0)
            return
            ;;
        *)
            echo -e "${RED}Opção inválida!${NC}"
            sleep 1
            ;;
    esac
}

# Menu principal
main_menu() {
    # Limpar arquivos temporários antigos ao iniciar
    rm -rf /tmp/webponto_pm_* 2>/dev/null
    
    while true; do
        show_header
        
        if list_processes; then
            # Obter contagem do arquivo temporário
            local temp_dir=$(cat /tmp/webponto_pm_dir 2>/dev/null)
            local count=$(cat "$temp_dir/count" 2>/dev/null)
            
            echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${BOLD}Opções:${NC}"
            echo -e "${GREEN}[1-$count]${NC} Matar processo específico"
            echo -e "${GREEN}[A]${NC} Matar TODOS os processos"
            echo -e "${GREEN}[P]${NC} Verificar portas"
            echo -e "${GREEN}[S]${NC} Iniciar serviços"
            echo -e "${GREEN}[R]${NC} Atualizar lista"
            echo -e "${GREEN}[Q]${NC} Sair"
            echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            read -p "Escolha uma opção: " choice
            
            case $choice in
                [1-9]|[1-9][0-9])
                    if [ "$choice" -ge 1 ] && [ "$choice" -le "$count" ]; then
                        kill_process "$choice"
                        sleep 2
                    else
                        echo -e "${RED}Número inválido! Escolha entre 1 e $count${NC}"
                        sleep 1
                    fi
                    ;;
                [Aa])
                    kill_all
                    ;;
                [Pp])
                    show_header
                    check_ports
                    ;;
                [Ss])
                    show_header
                    start_services
                    ;;
                [Rr])
                    continue
                    ;;
                [Qq])
                    echo -e "${CYAN}Até logo! 👋${NC}"
                    # Limpar arquivos temporários ao sair
                    rm -rf /tmp/webponto_pm_* 2>/dev/null
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Opção inválida!${NC}"
                    sleep 1
                    ;;
            esac
        else
            echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${BOLD}Opções:${NC}"
            echo -e "${GREEN}[S]${NC} Iniciar serviços"
            echo -e "${GREEN}[P]${NC} Verificar portas"
            echo -e "${GREEN}[R]${NC} Atualizar lista"
            echo -e "${GREEN}[Q]${NC} Sair"
            echo -e "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            read -p "Escolha uma opção: " choice
            
            case $choice in
                [Ss])
                    show_header
                    start_services
                    ;;
                [Pp])
                    show_header
                    check_ports
                    ;;
                [Rr])
                    continue
                    ;;
                [Qq])
                    echo -e "${CYAN}Até logo! 👋${NC}"
                    exit 0
                    ;;
                *)
                    echo -e "${RED}Opção inválida!${NC}"
                    sleep 1
                    ;;
            esac
        fi
    done
}

# Iniciar menu principal
main_menu
