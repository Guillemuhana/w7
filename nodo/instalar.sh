#!/bin/sh
#
# ───────────────────────────────────────────────────────────────
#  Alta de un nodo W-7 sobre OpenWrt
# ───────────────────────────────────────────────────────────────
#
# Deja el router del host listo para recibir visitantes: red de invitados
# aislada, SSID abierto, portal servido localmente y openNDS pidiéndole
# permiso a W-7 por cada dispositivo.
#
# Uso (por SSH al router):
#
#   scp -r nodo/ root@192.168.1.1:/tmp/w7-nodo
#   scp -r dist/ root@192.168.1.1:/tmp/w7-portal
#   ssh root@192.168.1.1
#   W7_NODO=A1043 W7_FASKEY=... W7_CLAVE_TICKET=... \
#     W7_API=https://xxxx.supabase.co/functions/v1 \
#     sh /tmp/w7-nodo/instalar.sh
#
# Los dos secretos son los de la fila de este nodo en la tabla `nodos` (ver
# api/schema.sql). Generalos con `openssl rand -hex 32` y no los reutilices
# entre nodos: si se filtra uno, se filtra un solo nodo.
#
# Es idempotente: se puede correr de nuevo para actualizar la configuración.

set -eu

: "${W7_NODO:?falta W7_NODO (el id del nodo, ej: A1043)}"
: "${W7_FASKEY:?falta W7_FASKEY}"
: "${W7_CLAVE_TICKET:?falta W7_CLAVE_TICKET}"
: "${W7_API:?falta W7_API (base de las Edge Functions)}"

SSID=${W7_SSID:-W-7}
RED=${W7_RED:-10.7.0.1}
PORTAL_PUERTO=${W7_PORTAL_PUERTO:-2080}
ORIGEN=$(dirname "$0")
PORTAL_ORIGEN=${W7_PORTAL_ORIGEN:-/tmp/w7-portal}
API_HOST=$(printf '%s' "$W7_API" | sed -e 's#^https\{0,1\}://##' -e 's#/.*##')

echo "-> Nodo $W7_NODO · SSID '$SSID' · portal en http://$RED:$PORTAL_PUERTO"

# ── Paquetes ───────────────────────────────────────────────────
# openssl-util: binauth verifica la firma del ticket sin salir a internet.
# curl: reporte de sesiones al backend.
echo "-> Instalando paquetes"
opkg update >/dev/null
opkg install opennds openssl-util curl >/dev/null

# ── Red de invitados, separada de la LAN del host ──────────────
echo "-> Red de invitados"
uci -q delete network.w7dev || true
uci set network.w7dev=device
uci set network.w7dev.type='bridge'
uci set network.w7dev.name='br-w7'

uci set network.w7=interface
uci set network.w7.proto='static'
uci set network.w7.device='br-w7'
uci set network.w7.ipaddr="$RED"
uci set network.w7.netmask='255.255.255.0'

# ── DHCP + RFC 8910 ────────────────────────────────────────────
# La opción 114 le dice al sistema operativo dónde está el portal. Es el
# camino limpio en iOS 14+ y Android 11+: abre el portal sin interceptar nada.
echo "-> DHCP y opción 114 (captive portal URL)"
uci set dhcp.w7=dhcp
uci set dhcp.w7.interface='w7'
uci set dhcp.w7.start='50'
uci set dhcp.w7.limit='150'
uci set dhcp.w7.leasetime='4h'
uci -q delete dhcp.w7.dhcp_option || true
uci add_list dhcp.w7.dhcp_option="114,http://$RED:$PORTAL_PUERTO/"

# ── Firewall ───────────────────────────────────────────────────
# La zona de invitados sale a internet y no ve la LAN. El input está cerrado
# salvo lo mínimo: DNS, DHCP, el portal y openNDS.
echo "-> Firewall"
zona=$(uci show firewall | sed -n "s/^firewall\.\(@zone\[[0-9]*\]\)\.name='w7'$/\1/p" | head -1)
if [ -z "$zona" ]; then
  uci add firewall zone >/dev/null
  zona="@zone[-1]"
fi
uci set "firewall.$zona.name"='w7'
uci set "firewall.$zona.network"='w7'
uci set "firewall.$zona.input"='REJECT'
uci set "firewall.$zona.output"='ACCEPT'
uci set "firewall.$zona.forward"='REJECT'

uci -q delete firewall.w7_a_wan || true
uci set firewall.w7_a_wan=forwarding
uci set firewall.w7_a_wan.src='w7'
uci set firewall.w7_a_wan.dest='wan'

for regla in "w7_dns 53 tcp udp" "w7_dhcp 67 udp" "w7_portal $PORTAL_PUERTO tcp" "w7_nds 2050 tcp"; do
  set -- $regla
  nombre=$1; puerto=$2; shift 2
  uci -q delete "firewall.$nombre" || true
  uci set "firewall.$nombre"=rule
  uci set "firewall.$nombre.name"="Permitir $nombre"
  uci set "firewall.$nombre.src"='w7'
  uci set "firewall.$nombre.dest_port"="$puerto"
  uci set "firewall.$nombre.target"='ACCEPT'
  for p in "$@"; do uci add_list "firewall.$nombre.proto"="$p"; done
done

# ── WiFi ───────────────────────────────────────────────────────
# Abierto, porque un portal cautivo necesita que cualquiera se pueda asociar.
# `isolate` corta el tráfico entre visitantes.
echo "-> SSID $SSID"
radio=$(uci show wireless | sed -n "s/^wireless\.\([a-z0-9]*\)=wifi-device$/\1/p" | head -1)
if [ -n "$radio" ]; then
  uci -q delete wireless.w7ap || true
  uci set wireless.w7ap=wifi-iface
  uci set wireless.w7ap.device="$radio"
  uci set wireless.w7ap.mode='ap'
  uci set wireless.w7ap.network='w7'
  uci set wireless.w7ap.ssid="$SSID"
  uci set wireless.w7ap.encryption='none'
  uci set wireless.w7ap.isolate='1'
  uci set "wireless.$radio.disabled"='0'
else
  echo "  ! no encontré radio wifi: creá el SSID a mano sobre la red 'w7'"
fi

# ── Portal servido desde el router ─────────────────────────────
# Antes de autorizarse el visitante no tiene internet: la SPA y sus imágenes
# tienen que estar acá. Escucha sólo en la IP de invitados, así el portal no
# queda expuesto en la LAN del host ni en la WAN.
echo "-> Portal local"
mkdir -p /www/w7-portal
if [ -d "$PORTAL_ORIGEN" ]; then
  cp -r "$PORTAL_ORIGEN"/. /www/w7-portal/
else
  echo "  ! no encontré el build en $PORTAL_ORIGEN (copiá dist/ y volvé a correr)"
fi

uci -q delete uhttpd.w7 || true
uci set uhttpd.w7=uhttpd
uci set uhttpd.w7.home='/www/w7-portal'
uci add_list uhttpd.w7.listen_http="$RED:$PORTAL_PUERTO"
uci set uhttpd.w7.index_page='index.html'
uci set uhttpd.w7.error_page='/index.html'
uci set uhttpd.w7.max_requests='40'

# ── openNDS ────────────────────────────────────────────────────
# fas_secure_enabled 1: openNDS manda `hid` al portal y sólo abre la puerta si
# le devolvemos sha256(hid + faskey) como `tok`. El navegador no lo puede
# calcular: el faskey vive en el router y en la API, nunca en el cliente.
echo "-> openNDS"
uci set opennds.@opennds[0].enabled='1'
uci set opennds.@opennds[0].gatewayname="$W7_NODO"
uci set opennds.@opennds[0].gatewayinterface='br-w7'
uci set opennds.@opennds[0].fasport="$PORTAL_PUERTO"
uci set opennds.@opennds[0].fasremoteip="$RED"
uci set opennds.@opennds[0].faspath='/index.html'
uci set opennds.@opennds[0].fas_secure_enabled='1'
uci set opennds.@opennds[0].faskey="$W7_FASKEY"
uci set opennds.@opennds[0].binauth='/etc/opennds/binauth_w7.sh'
uci set opennds.@opennds[0].preauthidletimeout='15'
uci set opennds.@opennds[0].sessiontimeout='120'
uci -q delete opennds.@opennds[0].walledgarden_fqdn_list || true
uci add_list opennds.@opennds[0].walledgarden_fqdn_list="$API_HOST"

# ── Secretos y scripts ─────────────────────────────────────────
echo "-> Configuración del nodo"
mkdir -p /etc/w7
umask 077
printf '%s\n' \
  "# Generado por instalar.sh — no compartir." \
  "W7_NODO=$W7_NODO" \
  "W7_CLAVE_TICKET=$W7_CLAVE_TICKET" \
  "W7_API=$W7_API" > /etc/w7/nodo.conf
chmod 600 /etc/w7/nodo.conf

install -m 755 "$ORIGEN/binauth_w7.sh" /etc/opennds/binauth_w7.sh
install -m 755 "$ORIGEN/latido.sh" /etc/w7/latido.sh

# Latido: le avisa a W-7 que el nodo sigue vivo. Con eso el mapa marca los
# nodos en línea y el Panel del Host puede detectar una caída.
crontab -l 2>/dev/null | grep -v '/etc/w7/latido.sh' > /tmp/w7.cron || true
echo '*/5 * * * * /etc/w7/latido.sh' >> /tmp/w7.cron
crontab /tmp/w7.cron
rm -f /tmp/w7.cron

# ── Aplicar ────────────────────────────────────────────────────
echo "-> Aplicando"
uci commit
/etc/init.d/network reload
/etc/init.d/dnsmasq restart
/etc/init.d/firewall restart
/etc/init.d/uhttpd restart
/etc/init.d/cron restart
/etc/init.d/opennds restart
wifi reload 2>/dev/null || true

echo
echo "Listo. Conectate al SSID '$SSID' desde un celular: debería abrirse el portal."
echo "Si algo no anda:  logread -e opennds  ·  logread -e w7-binauth  ·  ndsctl status"
