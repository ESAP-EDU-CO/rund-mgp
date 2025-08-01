# Multi-stage Dockerfile para rund-mgp (Angular 20 SSR)

# =============================================
# Etapa 1: Build - Transpilación de Angular
# =============================================
FROM node:22-alpine AS builder

# Información del mantenedor
LABEL maintainer="ocastelblanco@esap.edu.co"
LABEL description="Frontend Angular 20 SSR para proyecto RUND"

# Instala dependencias necesarias para el build
RUN apk update && apk add --no-cache \
  git \
  python3 \
  make \
  g++ \
  && rm -rf /var/cache/apk/*

# Establece el directorio de trabajo
WORKDIR /app

# Copia archivos de configuración de dependencias
COPY package*.json ./

# Instala todas las dependencias (incluidas las de desarrollo)
RUN npm ci

# Copia todo el código fuente
COPY . .

# Transpila la aplicación Angular para producción
RUN npm run build

# =============================================
# Etapa 2: Runtime - Imagen final optimizada
# =============================================
FROM node:22-alpine AS runtime

# Instala solo las dependencias del sistema necesarias para runtime
RUN apk update && apk add --no-cache \
  curl \
  && rm -rf /var/cache/apk/*

# Crea un usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
  adduser -S angular -u 1001 -G nodejs

# Establece el directorio de trabajo
WORKDIR /app

# Copia solo los archivos transpilados desde la etapa builder
COPY --from=builder --chown=angular:nodejs /app/dist/rund-mgp ./dist/rund-mgp

# Copia el script de inicio
COPY --chown=angular:nodejs start.sh ./start.sh

# Da permisos de ejecución al script de inicio
RUN chmod +x ./start.sh

# Cambia al usuario no-root
USER angular

# Expone el puerto (Angular SSR típicamente usa 4000)
EXPOSE 4000

# Configura variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=4000

# Healthcheck para verificar que la aplicación esté funcionando
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || curl -f http://localhost:$PORT/ || exit 1

# Punto de entrada: ejecuta el script de inicio
ENTRYPOINT ["./start.sh"]