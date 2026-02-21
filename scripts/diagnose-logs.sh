#!/bin/bash
# Diagnóstico del stack de logs (Grafana, Loki, Promtail) con NPM
# Ejecutar en el servidor: ./scripts/diagnose-logs.sh

set -e

echo "=== Diagnóstico del stack de logs ==="
echo ""

echo "1. Red 'proxy' (NPM debe estar aquí para resolver website-nginx):"
if docker network inspect proxy &>/dev/null; then
  echo "   OK - La red existe"
  echo "   Contenedores en proxy:"
  docker network inspect proxy --format '{{range .Containers}}   - {{.Name}}{{"\n"}}{{end}}' 2>/dev/null || echo "   (ninguno o error)"
else
  echo "   ERROR - La red 'proxy' no existe. Crear con: docker network create proxy"
fi
echo ""

echo "2. Contenedores del stack web-site:"
for c in website-nginx website-grafana website-loki website-promtail; do
  if docker ps --format '{{.Names}}' | grep -q "^${c}$"; then
    echo "   OK - $c corriendo"
  else
    echo "   FALTA - $c no está corriendo"
  fi
done
echo ""

echo "3. Grafana responde (desde el host):"
if docker exec website-nginx wget -q -O /dev/null --timeout=3 http://website-grafana:3000/api/health 2>/dev/null; then
  echo "   OK - Grafana responde dentro de la red"
else
  echo "   ERROR - Grafana no responde. Revisar: docker logs website-grafana"
fi
echo ""

echo "4. Loki responde:"
if docker exec website-grafana wget -q -O - --timeout=3 http://loki:3100/ready 2>/dev/null | grep -q ready; then
  echo "   OK - Loki responde"
else
  echo "   Revisar: docker logs website-loki"
fi
echo ""

echo "5. Variables de entorno (GRAFANA_PUBLIC_URL):"
if [ -f .env ]; then
  gurl=$(grep -E '^GRAFANA_PUBLIC_URL=' .env 2>/dev/null | cut -d= -f2)
  echo "   GRAFANA_PUBLIC_URL=${gurl:-'(no definida)'}"
else
  echo "   .env no encontrado - ver env.prod.example"
fi
echo ""

echo "=== Checklist NPM ==="
echo "En Nginx Proxy Manager, para grafana.bfmu.dev:"
echo "  - Forward Hostname: website-grafana"
echo "  - Forward Port: 3000"
echo "  - WebSockets: ACTIVADO"
echo ""
