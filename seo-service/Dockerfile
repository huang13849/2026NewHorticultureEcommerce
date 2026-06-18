FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN mkdir -p /app/data
EXPOSE 3011
CMD ["node", "server.js"]
