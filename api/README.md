# API de W-7

Dos Edge Functions de Supabase (Deno) y el esquema de la base. Es todo el
backend que el piloto necesita: la parte de red la hace el nodo, ver
[`../nodo/`](../nodo/).

```
api/
  schema.sql          -> tablas, RLS y la RPC de nodos cercanos
  _shared/ticket.js   -> firma del ticket y cálculo del rhid (Web Crypto)
  _shared/http.js     -> CORS, respuestas JSON, comparación en tiempo constante
  autorizar/index.js  -> POST /autorizar   · lo llama el portal
  sesion/index.js     -> POST /sesion      · lo llama el nodo
  ticket.test.mjs     -> tests de la firma (npm test)
```

## Los dos secretos

Cada nodo tiene los suyos, distintos entre sí y distintos por nodo:

| Secreto | Lo comparten | Para qué |
|---|---|---|
| `fas_key` | openNDS ↔ API | Calcular el `rhid`. Es la llave del portón: sin él nadie puede fabricar una autorización. |
| `clave_ticket` | binauth ↔ API | Firmar el ticket con los datos de la sesión, y autenticar al nodo cuando reporta. |

Ninguno de los dos llega nunca al navegador. Si se filtra el de un nodo, se
compromete ese nodo y ninguno más.

## Desplegar

```bash
supabase link --project-ref <tu-ref>
supabase db push                    # o pegar schema.sql en el SQL editor
supabase functions deploy autorizar
supabase functions deploy sesion
```

Las funciones usan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase
inyecta solo. **`--no-verify-jwt` es necesario** en las dos: al portal lo abre
un visitante sin sesión iniciada, y a `/sesion` la llama un script de shell.
La autenticación la hacen ellas por su cuenta (JWT opcional + MAC registrada en
`autorizar`, header `x-w7-nodo-clave` en `sesion`).

## Dar de alta un nodo

```sql
insert into public.nodos (id, alias, host_id, ubicacion, fas_key, clave_ticket)
values (
  'A1043',
  'Centro Vecinal',
  '<uuid del host>',
  st_point(-63.0214, -40.8287)::geography,   -- ojo: (lng, lat)
  '<openssl rand -hex 32>',
  '<openssl rand -hex 32>'
);
```

Esos mismos dos valores van al instalador del router:

```bash
W7_NODO=A1043 W7_FASKEY=... W7_CLAVE_TICKET=... \
  W7_API=https://<ref>.supabase.co/functions/v1 \
  sh /tmp/w7-nodo/instalar.sh
```

## Conectar el portal

En Vercel (o en el `.env` local):

```
VITE_API_URL=https://<ref>.supabase.co/functions/v1
```

Sin esa variable, `autorizarDispositivo()` sigue simulando y la demo funciona
igual. Es el único punto del front que ya habla con el backend real.

## Tests

```bash
npm test
```

Cubren la firma del ticket: ida y vuelta, clave equivocada, payload alterado,
vencimiento y entradas basura. Que el script de shell del router valide
exactamente los mismos tickets se prueba aparte — ver
[`../nodo/README.md`](../nodo/README.md).

## Lo que falta para producción

- **Rate limit en `/autorizar`** por MAC y por nodo. Hoy no hay: un visitante
  puede reintentar sin límite.
- **Cobro real**: el alta de la suscripción todavía no la escribe nadie. Falta
  el webhook de la billetera que inserta en `suscripciones` contra el token de
  la operación.
- **Alta de dispositivo**: hoy `autorizar` acepta una MAC ya registrada o un
  JWT. El primer registro (validación por WhatsApp/SMS) todavía es simulado en
  el portal.
- **Cifrado en reposo** del campo `activacion`, como dice el README raíz.
