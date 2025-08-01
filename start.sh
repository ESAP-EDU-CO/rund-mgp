#!/bin/sh

# Script de inicio para rund-mgp (Angular 20 SSR)
# Este script se ejecuta cuando se inicia el contenedor

echo "🚀 Iniciando rund-mgp (Angular SSR)..."

# Configura la zona horaria si está definida
if [ ! -z "$TZ" ]; then
    echo "⏰ Configurando zona horaria: $TZ"
fi

# Muestra información del entorno
echo "📍 Entorno: ${NODE_ENV:-production}"
echo "🌐 Puerto: ${PORT:-4000}"

# Navega al directorio de la aplicación transpilada
cd /app/dist/rund-mgp

# Verifica que el archivo server.mjs existe
if [ ! -f "server/server.mjs" ]; then
    echo "❌ Error: No se encuentra server/server.mjs"
    echo "📁 Contenido del directorio:"
    ls -la
    exit 1
fi

echo "✅ Iniciando servidor Angular SSR..."

# Ejecuta el servidor Angular SSR
exec node server/server.mjs