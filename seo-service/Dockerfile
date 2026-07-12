FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ARG CACHE_BUST=dev
RUN echo "cache_bust=$CACHE_BUST"
COPY . .
RUN mkdir -p /app/data
EXPOSE 3011
CMD ["node", "server.js"]
