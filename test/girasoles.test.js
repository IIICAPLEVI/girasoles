const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  \u2714 ' + name);
  else { console.error('  \u2718 ' + name + (detail ? ' \u2192 ' + detail : '')); failures++; }
}

console.log('\u25b6 girasoles \u2014 tests');

/* 1) estructura b\u00e1sica del HTML */
check('index.html existe y no vac\u00edo', html.length > 5000, 'longitud=' + html.length);
check('meta viewport presente (responsive m\u00f3vil)', /name="viewport"/.test(html));
check('charset UTF-8', /charset="UTF-8"/.test(html));
check('theme-color negro', /#000000/.test(html));
check('touch-action none (evita scroll al tocar)', /touch-action:\s*none/.test(html));

/* 2) carta de apertura (antes de la animaci\u00f3n) */
check('carta de apertura presente', /id="letter"/.test(html));
check('carta dice "Feliz 21 de Septiembre"', /Feliz 21 de Septiembre/.test(html));
check('carta: "no te puedo ver hoy"', /no te puedo ver hoy/i.test(html));
check('bot\u00f3n para abrir la experiencia', /id="abrir"/.test(html));

/* 3) extraer el JS embebido y validar sintaxis */
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
check('bloque <script> presente', !!scriptMatch);
if (scriptMatch) {
  const js = scriptMatch[1];
  try {
    new vm.Script(js, { filename: 'index-inline.js' });
    check('sintaxis JS v\u00e1lida', true);
  } catch (e) {
    check('sintaxis JS v\u00e1lida', false, e.message);
  }

  /* mensaje y personalizaci\u00f3n */
  check('mensaje para "Chezy"', /Para Chezy/.test(js));
  check('bloque de personalizaci\u00f3n CONFIG presente', /PERSONALIZA AQU\u00cd/.test(js));
  check('canvas #c referenciado', /getElementById\('c'\)/.test(js));

  /* 4) no debe quedar c\u00f3digo de diagn\u00f3stico/test */
  check('sin modo ?test residual', !js.includes('__advance') && !js.includes("has('test')"));

  /* 5) piezas clave de la animaci\u00f3n */
  for (const piece of [
    'const GA',                    // \u00e1ngulo dorado (espiral de semillas)
    'buildField',                  // campo de girasoles
    'layoutBouquet',               // armado del ramo central
    'drawBouquet',                 // dibujo del ramo
    'drawStars',                   // estrellas
    'drawFireflies',               // luci\u00e9rnagas
    'spawnHearts',                 // corazones al hacer clic
    'requestAnimationFrame(frame)' // bucle de animaci\u00f3n
  ]) {
    check('contiene ' + piece, js.includes(piece));
  }

  /* 6) rendimiento: corazones optimizados (sin lag) */
  check('corazones pre-renderizados (sprites)', js.includes('makeHeartSprite'));
  check('tope de part\u00edculas (evita el lag)', js.includes('MAX_PARTS'));

  /* 7) accesibilidad */
  check('respeta prefers-reduced-motion', /prefers-reduced-motion/.test(js));

  /* 8) dise\u00f1o responsive: ramas para pantalla vertical */
  check('layout responsive m\u00f3vil (H > W*1.2)', js.includes('H > W*1.2'));
}

/* 9) dependencias externas: debe ser autocontenido */
const externalSrc = html.match(/<script[^>]+src=|<link[^>]+href=(?!"data:|icon)/g);
check('sin dependencias externas (funciona offline)', !externalSrc, JSON.stringify(externalSrc));

process.exit(failures ? 1 : 0);
