FROM oven/bun:1.3.14-alpine
WORKDIR /app

COPY package.json bun.lock* ./
COPY patches ./patches
# mochi-framework is a file: dep on the vendor/ submodule, so it must exist before install resolves.
COPY vendor/mochi/packages/mochi ./vendor/mochi/packages/mochi
RUN bun install --production

COPY . .
RUN bun run build

ENV PORT=3333
EXPOSE 3333
CMD ["bun", "run", "start"]
