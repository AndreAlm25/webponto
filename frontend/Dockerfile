FROM node:20-alpine

WORKDIR /app

# Copiar tudo primeiro
COPY . .

# Instalar dependências
RUN npm install

# Modo desenvolvimento
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Expor porta
EXPOSE 3000

# Iniciar em modo dev
CMD ["npm", "run", "dev"]
