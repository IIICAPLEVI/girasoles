/* Tests del sitio: estructura del proyecto, mensajes y piezas clave del motor.
   `pretest` compila con Vite, así que aquí también validamos el build final. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log('  \u2714 ' + name);
  else { console.error('  \u2718 ' + name + (detail ? ' \u2192 ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

console.log('\u25b6 girasoles \u2014 tests (React + Vite)');

/* 1) HTML de entrada */
const html = read('index.html');
check('meta viewport presente (responsive m\u00f3vil)', /name="viewport"/.test(html));
check('charset UTF-8', /charset="UTF-8"/.test(html));
check('t\u00edtulo con girasol', /\ud83c\udf3b/.test(html));

/* 2) carta y mensajes */
const config = read('src/config.ts');
check('carta para Chezy', /Para Chezy/.test(config));
check('carta: "Feliz 21 de Septiembre"', /Feliz 21 de Septiembre/.test(config));
check('carta: "no te puedo ver hoy"', /no te puedo ver hoy/i.test(config));
check('mensaje final "Para Chezy \u2665"', /Para Chezy \u2665/.test(config));
check('sin firma "con todo mi coraz\u00f3n" (se quit\u00f3)', !/con todo mi coraz\u00f3n/.test(config));

/* 3) motor del ramo: sin hojas alrededor del ramo */
const bouquet = read('src/engine/bouquet.ts');
check('ramo: cabezas definidas', /HEADS_DEF/.test(bouquet));
check('ramo: tallos visibles', /drawStem/.test(bouquet));
check('ramo: list\u00f3n con mo\u00f1o', /drawRibbon/.test(bouquet));
check('ramo: SIN hojas decorativas (LEAF_DEFS eliminado)', !/LEAF_DEFS/.test(bouquet));
check('ramo: SIN drawLeaf', !/drawLeaf/.test(bouquet));
check('ramo: SIN array de leaves', !/leaves\s*:/.test(bouquet));
check('optimizaci\u00f3n: sprites horneados por cabeza', /bakePetal/.test(bouquet) && /bakeDisc/.test(bouquet));
check('optimizaci\u00f3n: capa est\u00e1tica horneada', /bakeStatic/.test(bouquet));

/* 4) texto final: firma opcional */
const text = read('src/engine/text.ts');
check('texto: firma opcional', /if \(msg\.firma\)/.test(text));

/* 5) sin restos de desarrollo en el motor */
for (const f of ['src/engine/bouquet.ts', 'src/engine/text.ts', 'src/engine/scene.ts', 'src/engine/field.ts']) {
  check('sin restos de desarrollo en ' + f, !/TODO|FIXME|console\.log\(/.test(read(f)));
}

/* 6) build de producci\u00f3n (un solo archivo) */
const dist = path.join(root, 'dist', 'index.html');
check('dist/index.html existe (corre `npm run build`)', fs.existsSync(dist));
if (fs.existsSync(dist)) {
  const d = read('dist/index.html');
  check('build: mensaje para Chezy presente', /Para Chezy/.test(d));
  check('build: todo inline (singlefile)', !/<script[^>]+src=/.test(d));
}

process.exit(failures ? 1 : 0);
