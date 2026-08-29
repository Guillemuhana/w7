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

## Notas

- Requiere tener Node.js instalado (18+).
- Es solo la capa visual/de interacción: los códigos OTP, el estado
  "conectado" y las estadísticas son simulados en el front. Falta
  conectar con el backend real (Auth/OTP, Bandwidth Manager, etc.).
