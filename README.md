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
