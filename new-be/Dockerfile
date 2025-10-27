FROM oven/bun:1-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json ./
COPY bun.lock ./

RUN bun install 

COPY prisma ./prisma
COPY . . 

RUN bunx prisma generate

EXPOSE 3001
CMD ["bun", "run", "bin.ts"]


