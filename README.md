# EngFlow — Aprende Inglés (PWA)

Aplicación web progresiva (PWA) para **aprender inglés desde cero hasta nivel avanzado**, diseñada para **hispanohablantes**. Funciona **100% sin conexión** después de la primera carga, con lecciones, 7 juegos interactivos, prueba de nivel CEFR (A1–C1) y gamificación (XP, rachas e insignias).

> Hecho con HTML5, CSS3 y JavaScript **vanilla** (sin frameworks). Ligera, rápida y fácil de desplegar.

## ✨ Características

- **Prueba de nivel diagnóstica** (15 preguntas): vocabulario, gramática, comprensión lectora y auditiva → asigna A1, A2, B1, B2 o C1.
- **5 niveles CEFR** con vocabulario y gramática progresivos.
- **7 juegos interactivos**:
  1. Word Match — unir palabras español/inglés
  2. Fill the Blank — completar frases (opción múltiple)
  3. Listening Echo — escuchar y escribir
  4. Flashcard Flip — tarjetas con repetición espaciada
  5. Sentence Builder — ordenar frases (B1+)
  6. Story Cloze — completar textos con banco de palabras (B2/C1)
  7. Speaking Mirror — practicar pronunciación con reconocimiento de voz (B1+)
- **Audio con Web Speech API** (text-to-speech) — sin archivos de audio que descargar; *fallback* a texto si el navegador no lo soporta.
- **Gamificación**: 10 XP por juego, 25 XP por hito, racha diaria e insignias.
- **PWA real**: instalable ("Añadir a pantalla de inicio"), Service Worker con estrategia *Cache-First*, página offline.
- **UI bilingüe** (Español/English), **modo oscuro**, diseño *mobile-first* (320px–1440px) y accesible (ARIA + navegación por teclado).

## 🧱 Tech Stack

- HTML5, CSS3 (variables/custom properties para theming)
- JavaScript ES Modules (vanilla, sin dependencias en runtime)
- Web Speech API (TTS + reconocimiento de voz)
- Service Worker + Web App Manifest (PWA)
- Datos de lecciones en JSON (`src/data/`)
- Despliegue: Netlify (sitio estático, sin build)

## 📁 Estructura

```
.
├── index.html          # App shell
├── offline.html        # Página offline
├── manifest.json       # Web App Manifest
├── sw.js               # Service Worker (Cache-First)
├── netlify.toml        # Configuración de Netlify
├── package.json
├── scripts/
│   ├── generate-icons.js   # Genera iconos PNG (sin dependencias)
│   └── serve.js            # Servidor estático para desarrollo
└── src/
    ├── css/styles.css
    ├── js/             # app, router, store, i18n, speech, data, quiz, gamification, views, ui
    ├── games/          # un módulo por juego
    ├── data/           # a1–c1.json + quiz.json
    └── assets/icons/   # iconos PWA (192/512)
```

## 🚀 Ejecutar en local

Requiere **Node.js** (solo para el servidor de desarrollo; la app no tiene dependencias).

```bash
npm install        # no instala nada en runtime (sin dependencias)
npm run dev        # servidor en http://localhost:5173
```

> El Service Worker requiere `http://localhost` o HTTPS para registrarse (no funciona abriendo el archivo con `file://`).

Regenerar los iconos (opcional):

```bash
npm run icons
```

## ☁️ Desplegar en Netlify

**Opción A — desde el repositorio (recomendado):**

1. En Netlify: **Add new site → Import an existing project** y conecta el repo `jrm456-w/English-App-`.
2. Netlify leerá `netlify.toml` automáticamente:
   - **Publish directory:** `.` (raíz)
   - **Build command:** `node scripts/generate-icons.js`
3. **Deploy site**. ¡Listo!

**Opción B — arrastrar y soltar:** sube la carpeta del proyecto en **Deploys → Drag and drop**.

> Variables de entorno: este proyecto **no necesita ninguna** ni hace llamadas externas. Si en el futuro añades alguna, configúrala en **Site settings → Environment variables** de Netlify (nunca en el código).

## 📝 Convención de commits

`feat:` nuevas funciones · `fix:` correcciones · `chore:` mantenimiento.

## 📄 Licencia

MIT.
