FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
ARG CACHE_BUST=dev
RUN echo "cache_bust=$CACHE_BUST"
COPY . .
EXPOSE 3010
CMD ["node", "server.js"]
