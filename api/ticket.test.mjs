import test from "node:test";
import assert from "node:assert/strict";
import { calcularRhid, firmarTicket, verificarTicket, aB64url, deB64url } from "./_shared/ticket.js";

const CLAVE = "clave-de-prueba-del-nodo-A1043";

test("base64url va y vuelve sin padding ni caracteres a escapar", () => {
  const bytes = new Uint8Array([251, 255, 62, 63, 0, 1, 2]);
  const texto = aB64url(bytes);
  assert.match(texto, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual([...deB64url(texto)], [...bytes]);
});

test("el rhid es estable y depende del faskey", async () => {
  const a = await calcularRhid("hid123", "faskey-uno");
  const b = await calcularRhid("hid123", "faskey-uno");
  const c = await calcularRhid("hid123", "faskey-dos");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("un ticket recién firmado se verifica", async () => {
  const datos = { nodo: "A1043", mac: "AA:BB:CC:DD:EE:FF", min: 120, exp: Math.floor(Date.now() / 1000) + 300 };
  const ticket = await firmarTicket(datos, CLAVE);
  const r = await verificarTicket(ticket, CLAVE);
  assert.equal(r.ok, true);
  assert.equal(r.datos.mac, "AA:BB:CC:DD:EE:FF");
});

test("no se verifica con otra clave", async () => {
  const ticket = await firmarTicket({ exp: Math.floor(Date.now() / 1000) + 300 }, CLAVE);
  assert.deepEqual(await verificarTicket(ticket, "otra-clave"), { ok: false, motivo: "firma" });
});

test("un ticket manipulado no se verifica", async () => {
  const ticket = await firmarTicket({ nodo: "A1043", min: 120, exp: Math.floor(Date.now() / 1000) + 300 }, CLAVE);
  const [cuerpo, firma] = ticket.split(".");
  const alterado = aB64url(new TextEncoder().encode(JSON.stringify({ nodo: "A1043", min: 99999, exp: Math.floor(Date.now() / 1000) + 300 })));
  assert.equal((await verificarTicket(`${alterado}.${firma}`, CLAVE)).ok, false);
});

test("un ticket vencido se rechaza", async () => {
  const ticket = await firmarTicket({ exp: Math.floor(Date.now() / 1000) - 1 }, CLAVE);
  assert.deepEqual(await verificarTicket(ticket, CLAVE), { ok: false, motivo: "vencido" });
});

test("basura entra, motivo claro sale", async () => {
  assert.deepEqual(await verificarTicket("", CLAVE), { ok: false, motivo: "formato" });
  assert.deepEqual(await verificarTicket("sin-punto", CLAVE), { ok: false, motivo: "formato" });
  assert.deepEqual(await verificarTicket(undefined, CLAVE), { ok: false, motivo: "formato" });
});
