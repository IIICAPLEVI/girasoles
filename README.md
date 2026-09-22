# 🌻 Para Chezy

Animación de un campo de girasoles con un ramo central, carta de apertura y mensaje final.
Construido con React + Vite + Tailwind; el build genera **un solo `dist/index.html`** (todo inline).

## Personalizar textos

Edita `src/config.ts`:

- `LETTER` → carta de apertura (nombre, título, texto, botón)
- `MESSAGES` → mensaje que aparece sobre el ramo
- `HINT` → pista final

## Desarrollo

```bash
npm install
npm run dev
```

## Publicar (GitHub + Vercel)

```bash
git add .
git commit -m "🌻 Girasoles para Chezy: ramo nuevo, carta y optimización"
git push
```

Vercel detecta Vite automáticamente (`npm run build`, carpeta `dist`) y redespliega con cada push.
Si prefieres subir sólo el HTML, copia `dist/index.html` a cualquier hosting estático.
