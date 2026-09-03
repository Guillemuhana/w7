# W-7 · Portal cautivo (prototipo)

Prototipo en React del portal cautivo de W-7: bienvenida, validación por
WhatsApp, validación por celular (OTP) y pantalla de conectado.

## Cómo correrlo

1. Abrí esta carpeta en VS Code.
2. En la terminal integrada:

   ```bash
   npm install
   npm run dev
   ```

3. Abrí la URL que te muestra la terminal (por defecto `http://localhost:5173`).

## Estructura

```
public/
  favicon.svg -> ícono de pestaña (marca W-7)
  logo.svg    -> lockup completo, para compartir / redes
src/
  App.jsx                    -> shell con las tres vistas
  components/Brand.jsx       -> logo W-7 en SVG + colores de marca
  components/CaptivePortal.jsx
  components/HostDashboard.jsx
  components/ClientDashboard.jsx
  styles.css                 -> paleta y estilos
  main.jsx                   -> punto de entrada de React
index.html
package.json
vite.config.js

api/    -> Edge Functions y esquema de la base (ver api/README.md)
nodo/   -> lo que se instala en el router del host (ver nodo/README.md)
docs/   -> arquitectura de red
```

## Marca

El logo está dibujado como SVG en `src/components/Brand.jsx`, así que escala
sin perder nitidez y toma los colores desde un solo lugar:

| Color        | Hex       | Uso                                  |
|--------------|-----------|--------------------------------------|
| Navy         | `#123C7E` | Textos fuertes, botones secundarios  |
| Turquesa     | `#17A5AE` | Acento, botón principal, gráficos    |
| Turquesa cl. | `#2DBFC6` | Degradado del botón principal        |
| Turquesa os. | `#0E8791` | Degradado del botón principal        |

Todos están como variables CSS en `:root` dentro de `src/styles.css`.

## Deploy

El proyecto es una SPA de Vite: Vercel la detecta sola
(`npm run build` -> carpeta `dist`), no hace falta configuración extra.

## Qué es real y qué está simulado

| | Estado |
|---|---|
| Autorización del dispositivo en el nodo | **Real** (API + openNDS/binauth, ver [api/](api/README.md) y [nodo/](nodo/README.md)) |
| Geolocalización del dispositivo | **Real** (Geolocation API, con permiso) |
| Mapa y calles | **Real** (MapLibre GL + OpenFreeMap) |
| Distancia a cada nodo | **Real** (haversine sobre tu posición) |
| Estado de conexión y latencia | **Real** (sonda propia + Network Information API) |
| Nodos, suscripción, pago, historial, OTP | Simulados |

Los nodos se ubican en relación a donde estés, así que la demo funciona en
cualquier ciudad.

## Modelo comercial

El cliente no compra datos ni tiene saldo: paga **USD 3,50 por mes** y queda
**activo** por 30 días. Con el estado activo entra a **cualquier nodo W-7 del
país** — hoy en Viedma, mañana en Córdoba Capital — sin volver a pagar y sin
descuento por MB. Si está inactivo, el panel sólo ofrece activar el mes.

- El cobro se hace por **billeteras virtuales** (Mercado Pago, Ualá, MODO,
  Naranja X, Personal Pay, Brubank, Binance Pay, USDT). W-7 no guarda datos de
  tarjeta ni de cuenta: la billetera devuelve un token de la operación.
- De cada alta se guarda un **registro de activación** (fecha, nodo y zona
  desde donde se pagó). Es trazabilidad de la red, no un límite de cobertura;
  en el backend ese registro va cifrado en reposo.

Precio, duración y billeteras están en `src/lib/demoBackend.js`
(`PRECIO_MENSUAL_USD`, `DIAS_SUSCRIPCION`, `BILLETERAS`).

## Cómo se conecta el router con el dispositivo

El portal no conecta a nadie: el que abre la puerta es el router del nodo
(OpenWrt + openNDS). El celular ya está asociado al WiFi y con IP, pero en
estado `preauth`; el portal le pide a W-7 un ticket firmado para esa MAC y se
lo entrega al router, que recién ahí lo deja salir.

- El handshake completo, el walled garden, la detección de portal cautivo y el
  camino a RADIUS están en [docs/arquitectura-red.md](docs/arquitectura-red.md).
- Los parámetros que manda el router se leen en `src/lib/router.js`.
- El pedido de autorización es `autorizarDispositivo()` en
  `src/lib/demoBackend.js`: si está `VITE_API_URL` pega contra la API real,
  y si no, simula.
- La API que emite la autorización está en [api/](api/README.md).
- Lo que va en el router del host, en [nodo/](nodo/README.md).

Para probar el flujo real sin router, abrí la demo con los parámetros que
agregaría openNDS:

```
http://localhost:5173/?clientmac=AA:BB:CC:DD:EE:FF&clientip=10.7.0.53&gatewayname=A1043&gatewayaddress=10.7.0.1&hid=demo123&redir=http://example.com
```

Con esos parámetros el portal intenta el redirect final al router; sin ellos
(el caso de Vercel) se queda en la pantalla de conectado.

## Conectar el backend (Supabase)

Toda la capa de datos está aislada en `src/lib/demoBackend.js`. Hoy devuelve
datos simulados con una demora artificial; para pasar a Supabase se reemplaza
el cuerpo de cada función manteniendo la misma firma, sin tocar los
componentes. El archivo incluye el ejemplo de la consulta equivalente.

Cuando llegue ese momento harán falta dos variables de entorno en Vercel:
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.

## Notas

- Requiere tener Node.js instalado (18+).
- La geolocalización sólo funciona en HTTPS o `localhost`; en Vercel está
  cubierto. Si el usuario no da permiso, la demo cae en una zona de ejemplo.
- El mapa no necesita API key: OpenFreeMap es gratuito y sin límite de uso.

## Licencia y propiedad intelectual

Software **propietario**. © 2026 W-7 Social Network — Todos los derechos
reservados. Este repositorio no es código abierto: no se permite copiar,
modificar, redistribuir ni reutilizar el código, el diseño ni la identidad
visual sin autorización previa y por escrito. Ver [LICENSE](LICENSE).

## Marcas de terceros

Los logos de PayPal y Mercado Pago que aparecen en el panel de pago son
versiones **dibujadas a mano en SVG**, no los archivos oficiales (el CDN de
Mercado Pago responde 403 a la descarga directa). Sirven para la demo, pero
antes de producción hay que reemplazarlos por los assets oficiales de cada
marca y respetar sus guías de uso:

- Mercado Pago: https://www.mercadopago.com.ar/ayuda/marca
- PayPal: https://www.paypal.com/us/webapps/mpp/logo-center

Lo mismo aplica a `public/huerta-comunitaria.jpg`, que es una foto de terceros
usada de forma provisoria.
