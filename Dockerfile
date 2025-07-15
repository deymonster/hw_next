# Используем многоэтапную сборку для оптимизации размера образа
FROM node:20-alpine AS deps
WORKDIR /app

# Устанавливаем зависимости для сборки native модулей
RUN apk add --no-cache libc6-compat

# Копируем файлы зависимостей
COPY package.json yarn.lock* .yarnrc* ./

# Устанавливаем зависимости
RUN yarn install --frozen-lockfile --network-timeout 600000

# Этап сборки
FROM node:20-alpine AS builder
WORKDIR /app

# Добавляем build-arg для ENCRYPTION_KEY
ARG ENCRYPTION_KEY
ENV ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Копируем зависимости из предыдущего этапа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Генерируем Prisma клиент
RUN npx prisma generate

# Форматируем код перед сборкой
RUN yarn format

# Собираем приложение
RUN yarn build

# Этап для production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Добавляем пользователя nextjs для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем необходимые файлы из этапа сборки
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Устанавливаем только production зависимости
COPY --from=builder /app/package.json /app/yarn.lock* ./
RUN yarn install --production --frozen-lockfile --network-timeout 600000

# Переключаемся на пользователя nextjs
USER nextjs

# Открываем порт 3000
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]