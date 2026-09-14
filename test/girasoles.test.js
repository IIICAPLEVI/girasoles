const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  ✔ ' + name);
  else { console.error('  ✘ ' + name + (detail ? ' → ' + detail : '')); failures++; }
}

console.log('▶ girasoles — tests');

/* 1) estructura básica del HTML */
check('index.html existe y no vacío', html.length > 5000, 'longitud=' + html.length);
check('meta viewport presente (responsive móvil)', /name="viewport"/.test(html));
check('charset UTF-8', /charset="UTF-8"/.test(html));
check('theme-color negro', /#000000/.test(html));
check('touch-action none (evita scroll al tocar)', /touch-action:\s*none/.test(html));

/* 2) extraer el JS embebido y validar sintaxis */
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
check('bloque <script> presente', !!scriptMatch);
if (scriptMatch) {
  const js = scriptMatch[1];
  try {
    new vm.Script(js, { filename: 'index-inline.js' });
    check('sintaxis JS válida', true);
  } catch (e) {
    check('sintaxis JS válida', false, e.message);
  }
  /* 3) contenido esperado */
  check('título "Para ti ♥"', /'Para ti ♥'/.test(js));
  check('subtítulo "Mich Homosexual"', /'Mich Homosexual'/.test(js));
  check('canvas #c referenciado', /getElementById\('c'\)/.test(js));
  check('bloque de personalización CONFIG presente', /PERSONALIZA AQUÍ/.test(js));
  /* 4) no debe quedar código de diagnóstico/test */
  check('sin modo ?test residual', !js.includes('__advance') && !js.includes("has('test')"));
  /* 5) piezas clave de la animación */
  for (const piece of [
    'const GA',                    // ángulo dorado (espiral de semillas)
    'buildField',                  // campo de girasoles
    'drawBig',                     // girasol grande central
    'drawStars',                   // estrellas
    'drawFireflies',               // luciérnagas
    'spawnHearts',                 // corazones al hacer clic
    'requestAnimationFrame(frame)' // bucle de animación
  ]) {
    check('contiene ' + piece, js.includes(piece));
  }
  /* 6) diseño responsive: ramas para pantalla vertical */
  check('layout responsive móvil (H > W*1.2)', js.includes('H > W*1.2'));
}

/* 7) dependencias externas: debe ser autocontenido */
const externalSrc = html.match(/<script[^>]+src=|<link[^>]+href=(?!"data:|icon)/g);
check('sin dependencias externas (funciona offline)', !externalSrc, JSON.stringify(externalSrc));

process.exit(failures ? 1 : 0);
