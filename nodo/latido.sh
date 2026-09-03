#!/bin/sh
# Le avisa a W-7 que este nodo sigue en línea. Lo corre cron cada 5 minutos.
. /etc/w7/nodo.conf
curl -s -m 10 -o /dev/null \
  -H "content-type: application/json" \
  -H "x-w7-nodo-clave: $W7_CLAVE_TICKET" \
  -d "{\"nodo\":\"$W7_NODO\",\"evento\":\"latido\"}" \
  "$W7_API/sesion"
