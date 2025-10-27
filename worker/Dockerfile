FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY bun.lock ./

RUN bun install 

COPY . . 

EXPOSE 3001
EXPOSE 8081
CMD ["bun", "run", "bin.ts"]


