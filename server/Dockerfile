FROM node:20-alpine

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Copie du code source
COPY . .

# Compilation TypeScript
RUN npm run build

# Exposition du port
EXPOSE 3000

# Démarrage du serveur
CMD ["npm", "start"] 