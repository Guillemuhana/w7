# Cómo se conecta un router W-7 con los dispositivos

Este documento describe la capa que hoy no está en el prototipo: qué pasa entre
el celular del visitante y el router del host, y en qué punto entra el portal
que ya tenemos hecho en React.

## El problema de fondo

El celular se asocia al WiFi (capa 2) mucho antes de que exista un "usuario
W-7". Cuando el portal aparece en pantalla, el dispositivo **ya está en la red
del nodo**: tiene IP, tiene gateway y tiene DNS. Lo único que no tiene es
permiso para salir a internet.

Entonces la conexión no la hace el portal: la hace el router. El portal sólo
**pide** que el router abra la puerta para una MAC concreta.

## Las piezas

| Pieza | Qué es | Elección |
|---|---|---|
| Nodo | El router del host | Router doméstico con **OpenWrt** (23.05+) |
| Puerta | El que bloquea/habilita cada dispositivo | **openNDS** (heredero de nodogsplash) |
| Portal | Lo que ve el visitante | Esta SPA, servida desde el propio router |
| API | Quien sabe si la suscripción está activa | `api.w-7.net` (Supabase Edge Function) |
| Túnel | Cómo el nodo habla con W-7 sin abrir puertos | **WireGuard** saliente |

En el router conviven dos redes separadas:

- La LAN del host, intacta.
- Una interfaz/VLAN aparte para W-7 (`10.7.0.0/24`), con *client isolation*
  entre visitantes. Un visitante nunca ve la impresora ni las cámaras del
  vecino.

El SSID de visitantes es abierto (`W-7`), porque un portal cautivo necesita
que cualquiera pueda asociarse sin clave. En routers que lo soporten se suma
`W-7 Segura` con **WPA3-OWE**: sigue sin contraseña, pero el aire va cifrado.

## El handshake, paso a paso

1. **Asociación + DHCP.** El celular se engancha al SSID `W-7` y el router le
   da IP en `10.7.0.0/24`. openNDS lo anota en su tabla de clientes con estado
   `preauth`.

2. **Bloqueo selectivo.** nftables deja pasar sólo DHCP, DNS y el *walled
   garden* (el propio router + `api.w-7.net`). Todo lo demás: DROP.

3. **Detección de portal cautivo.** El sistema operativo, apenas se asocia,
   pide una URL conocida para ver si hay internet:

   - iOS/macOS → `captive.apple.com/hotspot-detect.html`
   - Android → `connectivitycheck.gstatic.com/generate_204`
   - Windows → `www.msftconnecttest.com/connecttest.txt`

   El router intercepta esa consulta (DNS + `HTTP 302`) y responde con un
   redirect al portal. Ahí es cuando salta solo el navegador chico del celular.

   Además publicamos la **opción DHCP 114** (RFC 8910) con la URL del portal y
   la API de estado de RFC 8908. Ése es el camino limpio en iOS 14+ y
   Android 11+: el sistema abre el portal sin necesidad de interceptar nada.

4. **El redirect trae los datos del dispositivo.** openNDS agrega a la URL del
   portal:

   ```
   ?clientmac=AA:BB:CC:DD:EE:FF
   &clientip=10.7.0.53
   &gatewayname=A1043          <- id del nodo
   &gatewayaddress=10.7.0.1
   &hid=<hash de sesión>       <- anti-replay, vive minutos
   &redir=<URL original>
   ```

   Eso es exactamente lo que lee `src/lib/router.js`.

5. **El visitante hace lo suyo** en el portal: valida por WhatsApp/SMS o paga
   el mes.

6. **Autorización.** El portal manda a `POST /autorizar` `{ nodo, mac, hid,
   metodo }`. La API verifica que la suscripción esté activa y devuelve dos
   valores, ninguno de los cuales se puede fabricar desde el navegador:

   | | Qué es | Con qué secreto |
   |---|---|---|
   | `tok` | `sha256(hid + faskey)` | `fas_key` |
   | `custom` | el ticket de sesión firmado (nodo, MAC, minutos, vencimiento) | `clave_ticket` |

   El `tok` es lo único que openNDS acepta como prueba de que la autorización
   la dio W-7; el `custom` viaja adentro y lleva la cuota.

7. **Abrir la puerta.** El navegador entrega los dos al router:

   ```
   http://10.7.0.1:2050/opennds_auth/?tok=<rhid>&custom=<ticket b64url>&redir=<URL original>
   ```

   openNDS comprueba el `tok` y le pasa el `custom` a su script *binauth*
   (`nodo/binauth_w7.sh`), que **verifica la firma localmente, sin salir a
   internet**: un nodo con el enlace caído igual autoriza a alguien que ya
   tiene el ticket. Recién entonces la MAC pasa a la cadena `AUTHENTICATED` de
   nftables, con la cuota que venía en el ticket.

8. **Sesión y cierre.** El router lleva los contadores. Cuando se agota la
   cuota, o el dispositivo se va del aire, la MAC vuelve a `preauth`. Cada
   pocos minutos el nodo hace *heartbeat* a la API (está vivo, N clientes,
   X bytes) — eso es lo que después alimenta el Panel del Host.

## Detalles que deciden si funciona o no

**HTTPS no se puede interceptar.** Con HSTS, si el visitante escribe
`https://algo` no hay redirect posible: la pestaña queda colgada. Por eso nunca
dependemos de eso — sólo del *probe* HTTP del sistema operativo y de la
opción DHCP 114.

**El portal se sirve desde el router.** Antes de autorizarse el dispositivo no
tiene internet, así que la SPA y sus imágenes tienen que estar en el nodo
(por eso `huerta-comunitaria.jpg` es local y no un CDN). Lo único que va al
walled garden es la API. Poner en la whitelist un host de Vercel no sirve:
resuelve a muchas IPs cambiantes.

**Nada de abrir puertos en la casa del host.** El host tiene IP dinámica y
seguramente CGNAT. La conexión siempre la inicia el router: túnel WireGuard
saliente al concentrador de W-7, o HTTPS saliente con polling.

**Responsabilidad legal del host.** El tráfico del visitante sale por la IP del
vecino. Dos mitigaciones, y conviene tener las dos: registro de sesiones
(MAC, nodo, timestamps) y — la buena — sacar todo el tráfico de visitantes por
el túnel WireGuard, para que salga a internet con IP de W-7 y no del host.

## Cuándo pasar a RADIUS

openNDS + binauth alcanza y sobra para el piloto: sin puertos abiertos, sin
servidor AAA que mantener. Cuando la red crezca, el reemplazo natural es
**FreeRADIUS**: el router manda `Access-Request`, el AAA responde
`Access-Accept` con `Session-Timeout` y límites de banda WISPr, el accounting
es estándar (`Interim-Update`) y se puede cortar una sesión de forma remota con
un `CoA/Disconnect`. El portal no cambia: sigue hablando con la misma API.

## Roaming entre nodos

La identidad vive en W-7, no en el router. Al llegar a otro nodo el flujo se
repite entero, pero como la suscripción está activa y el navegador guarda un
token de dispositivo, el portal autoriza sin pedirle nada al visitante. La MAC
sólo ata la sesión local de ese nodo.

## Dónde está cada cosa

| Paso | Código |
|---|---|
| 1-3 · red, bloqueo, detección | [`nodo/instalar.sh`](../nodo/instalar.sh) |
| 4 · leer los parámetros del redirect | [`src/lib/router.js`](../src/lib/router.js) |
| 5-6 · pedir la autorización | [`src/lib/demoBackend.js`](../src/lib/demoBackend.js) → [`api/autorizar/`](../api/autorizar/index.js) |
| 6 · firmar `tok` y `custom` | [`api/_shared/ticket.js`](../api/_shared/ticket.js) |
| 7 · abrir la puerta | [`nodo/binauth_w7.sh`](../nodo/binauth_w7.sh) |
| 8 · sesiones y latido | [`api/sesion/`](../api/sesion/index.js), [`nodo/latido.sh`](../nodo/latido.sh) |

## Mínimo para el piloto

1. Un router OpenWrt con openNDS y la red de visitantes → `sh nodo/instalar.sh`.
2. El build de esta SPA copiado al router (lo hace el mismo instalador).
3. Las dos Edge Functions desplegadas → [`api/README.md`](../api/README.md).
4. WireGuard del nodo al concentrador. **Es lo único de esta lista que
   todavía no está escrito.**
