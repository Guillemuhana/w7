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
src/
  App.jsx     -> toda la lógica y estilos del portal cautivo
  main.jsx    -> punto de entrada de React
index.html
package.json
vite.config.js
```

## Notas

- Requiere tener Node.js instalado (18+).
- Es solo la capa visual/de interacción: los códigos OTP, el estado
  "conectado" y las estadísticas son simulados en el front. Falta
  conectar con el backend real (Auth/OTP, Bandwidth Manager, etc.).
