#!/bin/sh
#
# ───────────────────────────────────────────────────────────────
#  binauth de W-7  ·  /etc/opennds/binauth_w7.sh
# ───────────────────────────────────────────────────────────────
#
# openNDS ejecuta este script antes de abrir la puerta para un cliente y otra
# vez cuando la sesión termina. Es el último control: si sale distinto de 0,
# el cliente NO se autoriza, sin importar lo que haya dicho el portal.
#
# Verifica el ticket de W-7 con la clave del nodo, acá mismo, sin salir a
# internet: si el enlace del host está caído el nodo igual autoriza a alguien
# que ya tenía el ticket. El reporte a la API se manda aparte y en segundo
# plano, así una API lenta nunca demora una conexión.
#
# Contrato de argumentos (openNDS 10.x):
#
#   auth_client  <mac> <usuario> <clave> <redir> <custom_b64> <tipo>
#   *_deauth     <mac> <bytes_in> <bytes_out> <inicio> <fin> <token> <custom_b64>
#
# El orden cambió entre versiones mayores de openNDS. Antes de ponerlo en
# producción, confirmalo en tu firmware con el ejemplo que trae el paquete:
#   uci set opennds.@opennds[0].binauth='/etc/opennds/binauth_log.sh'
#   /etc/init.d/opennds restart   # y mirá /tmp/ndslog/binauthlog.log
#
# Salida esperada por openNDS en auth_client:
#   <segundos> <subida_kbps> <bajada_kbps> <cuota_subida> <cuota_bajada>

set -u

CONF=/etc/w7/nodo.conf
[ -r "$CONF" ] || { logger -t w7-binauth "falta $CONF"; exit 1; }
# shellcheck disable=SC1090
. "$CONF"

: "${W7_NODO:?}" "${W7_CLAVE_TICKET:?}" "${W7_API:?}"

# Sin límite de velocidad por cliente: el reparto lo hace SQM en la interfaz.
SUBIDA_KBPS=0
BAJADA_KBPS=0
CUOTA_SUBIDA=0
CUOTA_BAJADA=0

log() { logger -t w7-binauth "$*"; }

# Reporta a la API sin bloquear a openNDS: si el túnel está caído, se pierde
# el evento y lo reconstruye el próximo latido. Nunca demora una conexión.
reportar() {
  [ -x /usr/bin/curl ] || return 0
  curl -s -m 5 -o /dev/null \
    -H "content-type: application/json" \
    -H "x-w7-nodo-clave: $W7_CLAVE_TICKET" \
    -d "$1" "$W7_API/sesion" &
}

# base64url -> base64 con padding
despadear() {
  s=$(printf '%s' "$1" | tr -- '-_' '+/')
  case $(( ${#s} % 4 )) in
    2) s="$s==" ;;
    3) s="$s=" ;;
    1) return 1 ;;
  esac
  printf '%s' "$s"
}

de_b64url() { despadear "$1" | openssl enc -base64 -d -A 2>/dev/null; }

# Lee un campo del JSON del ticket. Alcanza: el JSON lo generamos nosotros y
# no tiene anidamiento ni comillas escapadas.
campo() {
  printf '%s' "$1" | sed -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\{0,1\}\([^\",}]*\).*/\1/p"
}

METODO=$1
MAC=$(printf '%s' "${2:-}" | tr 'a-f' 'A-F')

case "$METODO" in
  auth_client)
    CUSTOM=${6:-}
    [ -n "$CUSTOM" ] || { log "sin ticket para $MAC"; exit 1; }

    TICKET=$(de_b64url "$CUSTOM")
    CUERPO=${TICKET%%.*}
    FIRMA=${TICKET#*.}
    [ -n "$CUERPO" ] && [ "$CUERPO" != "$TICKET" ] || { log "ticket mal formado ($MAC)"; exit 1; }

    ESPERADA=$(printf '%s' "$CUERPO" \
      | openssl dgst -sha256 -hmac "$W7_CLAVE_TICKET" -binary \
      | openssl enc -base64 -A | tr -- '+/' '-_' | tr -d '=')
    [ "$FIRMA" = "$ESPERADA" ] || { log "firma invalida ($MAC)"; exit 1; }

    DATOS=$(de_b64url "$CUERPO")
    T_NODO=$(campo "$DATOS" nodo)
    T_MAC=$(campo "$DATOS" mac)
    T_EXP=$(campo "$DATOS" exp)
    T_MIN=$(campo "$DATOS" min)

    [ "$T_NODO" = "$W7_NODO" ] || { log "ticket de otro nodo ($T_NODO)"; exit 1; }
    [ "$T_MAC" = "$MAC" ] || { log "ticket de otra MAC ($T_MAC != $MAC)"; exit 1; }
    [ "${T_EXP:-0}" -gt "$(date +%s)" ] 2>/dev/null || { log "ticket vencido ($MAC)"; exit 1; }

    SEGUNDOS=$(( ${T_MIN:-0} * 60 ))
    [ "$SEGUNDOS" -gt 0 ] || { log "ticket sin minutos ($MAC)"; exit 1; }

    reportar "{\"nodo\":\"$W7_NODO\",\"mac\":\"$MAC\",\"evento\":\"inicio\"}"
    log "autorizado $MAC por ${T_MIN}min"
    echo "$SEGUNDOS $SUBIDA_KBPS $BAJADA_KBPS $CUOTA_SUBIDA $CUOTA_BAJADA"
    exit 0
    ;;

  client_auth|ndsctl_auth)
    # Ya autorizado por otra vía (ndsctl a mano): sólo lo registramos.
    reportar "{\"nodo\":\"$W7_NODO\",\"mac\":\"$MAC\",\"evento\":\"inicio\"}"
    exit 0
    ;;

  *_deauth)
    reportar "{\"nodo\":\"$W7_NODO\",\"mac\":\"$MAC\",\"evento\":\"fin\",\"motivo\":\"$METODO\",\"bytesBajada\":${3:-0},\"bytesSubida\":${4:-0}}"
    exit 0
    ;;

  *)
    log "metodo desconocido: $METODO"
    exit 0
    ;;
esac
