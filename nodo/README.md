# El nodo: router del host

Lo que hay que poner en el router de un vecino para que sea un nodo W-7.

```
nodo/
  instalar.sh     -> deja el router configurado de cero (idempotente)
  binauth_w7.sh   -> el control final: valida el ticket antes de abrir
  latido.sh       -> avisa cada 5 minutos que el nodo sigue vivo
```

El diseño completo está en
[`../docs/arquitectura-red.md`](../docs/arquitectura-red.md).

## Hardware

Cualquier router con **OpenWrt 23.05+**, al menos 128 MB de RAM y 16 MB de
flash — la SPA compilada pesa unos 2 MB y va en el propio router. Probado en
la práctica sobre modelos tipo Xiaomi 4A Gigabit / GL-iNet.

Hacen falta `opennds`, `openssl-util` y `curl`; el instalador los baja solo.

## Instalación

```bash
npm run build                                   # en la raíz del repo
scp -r nodo/ root@192.168.1.1:/tmp/w7-nodo
scp -r dist/ root@192.168.1.1:/tmp/w7-portal
ssh root@192.168.1.1

W7_NODO=A1043 \
W7_FASKEY=<el de la tabla nodos> \
W7_CLAVE_TICKET=<el de la tabla nodos> \
W7_API=https://<ref>.supabase.co/functions/v1 \
  sh /tmp/w7-nodo/instalar.sh
```

Qué deja hecho:

- Red `w7` en `10.7.0.1/24` sobre un bridge propio, **separada de la LAN del
  host** y con aislamiento entre visitantes.
- SSID abierto `W-7` (se cambia con `W7_SSID`).
- DHCP con la **opción 114** apuntando al portal (RFC 8910).
- Zona de firewall que sale a la WAN y no ve la LAN del host.
- uhttpd sirviendo la SPA en `10.7.0.1:2080`, escuchando **sólo** en la red de
  invitados.
- openNDS con FAS seguro (`fas_secure_enabled 1`) y `binauth_w7.sh`.
- `/etc/w7/nodo.conf` en modo 600 con los secretos, y el latido en cron.

## Antes de producción: verificá el orden de argumentos de binauth

`binauth_w7.sh` está escrito contra el contrato de **openNDS 10.x**:

```
auth_client  <mac> <usuario> <clave> <redir> <custom_b64> <tipo>
*_deauth     <mac> <bytes_in> <bytes_out> <inicio> <fin> <token> <custom_b64>
```

Ese orden cambió entre versiones mayores. Confirmalo contra el firmware que
tengas puesto, con el ejemplo que trae el paquete:

```bash
uci set opennds.@opennds[0].binauth='/etc/opennds/binauth_log.sh'
/etc/init.d/opennds restart
# conectá un celular y mirá
cat /tmp/ndslog/binauthlog.log
```

Si las posiciones no coinciden, ajustá `$6` en `auth_client` y `$3`/`$4` en los
`*_deauth`. Es el único punto del nodo que depende de la versión.

## Que el router valide los mismos tickets que firma la API

La firma se hace en JavaScript (Web Crypto, en la Edge Function) y se verifica
en shell (`openssl dgst -sha256 -hmac`, en el router). Que las dos puntas
coincidan se comprueba así, desde la raíz del repo:

```bash
node -e "import('./api/_shared/ticket.js').then(async m => {
  const clave = 'clave-de-prueba';
  const t = await m.firmarTicket(
    { nodo: 'A1043', mac: 'AA:BB:CC:DD:EE:FF', min: 120,
      exp: Math.floor(Date.now()/1000) + 300 }, clave);
  console.log(m.aB64url(new TextEncoder().encode(t)));
})"
```

y con esa salida, en un shell con `openssl`:

```bash
printf 'W7_NODO=A1043\nW7_CLAVE_TICKET=clave-de-prueba\nW7_API=http://x\n' > /tmp/nodo.conf
sed 's#^CONF=/etc/w7/nodo.conf#CONF=/tmp/nodo.conf#' nodo/binauth_w7.sh > /tmp/b.sh
sh /tmp/b.sh auth_client AA:BB:CC:DD:EE:FF - - - "<el base64url de arriba>"
# -> 7200 0 0 0 0    (y exit 0)
```

Un ticket vencido, de otro nodo, de otra MAC o firmado con otra clave sale con
exit 1 y sin salida: el router no abre.

## Diagnóstico

```bash
ndsctl status              # clientes y su estado
ndsctl clients             # tabla de MACs
logread -e opennds
logread -e w7-binauth      # por qué se rechazó un ticket
```

| Síntoma | Dónde mirar |
|---|---|
| El portal no salta solo | Opción 114 en dnsmasq, y el probe HTTP del SO (`captive.apple.com`) |
| Salta el portal pero no autoriza | `logread -e w7-binauth`: firma, MAC, nodo o vencimiento |
| Autoriza pero no navega | Zona de firewall `w7` → `wan`, y la salida de la WAN del host |
| El nodo figura caído | `/etc/w7/latido.sh` a mano; suele ser el túnel |

## Pendientes

- **SQM**: reservarle al host un piso de banda y bajarle la prioridad al
  tráfico de visitantes. Sin esto, un visitante puede saturarle la línea.
- **WireGuard**: sacar el tráfico de visitantes por el túnel de W-7, para que
  no salga con la IP del host. Es la mitigación que importa.
- **WPA3-OWE** como segundo SSID donde el hardware lo soporte.
