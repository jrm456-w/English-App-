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
- **📖 Historias cortas (input comprensible)** — uno de los métodos más eficaces para aprender a hablar. Cada historia incluye:
  - **Lectura con audio**: narración palabra por palabra (Web Speech API) con resaltado de la frase actual.
  - **Toca cualquier palabra** para oír su pronunciación y ver su traducción al español.
  - **Modo Shadowing** (técnica de políglotas): escuchas una frase y la repites; la app evalúa tu pronunciación.
  - **Traducción frase a frase** que se revela bajo demanda.
  - **Quiz de comprensión** al final, con XP e insignias "Primera Historia" / "Ratón de Biblioteca".
- **Gamificación**: 10 XP por juego, 15 XP por historia, 25 XP por hito, racha diaria e insignias.
- **PWA real**: instalable ("Añadir a pantalla de inicio"), Service Worker con estrategia *Cache-First*, página offline.
- **UI bilingüe** (Español/English), **modo oscuro**, diseño *mobile-first* (320px–1440px) y accesible (ARIA + navegación por teclado).

## 📈 ¿Cómo se avanza de nivel? (lógica de progreso)

El progreso ya **no se llena solo por entrar** a una unidad. Las reglas son claras:

- Un **juego** cuenta como *aprobado* si aciertas el **60%+**.
- Una **unidad** se **completa** cuando apruebas al menos **2 de sus juegos**.
- El **progreso del nivel** = unidades completadas ÷ total de unidades.
- Cuando completas el **80%** de las unidades, aparece el botón **"Avanzar al siguiente nivel"** (otorga insignia de graduación + XP).

### 🎯 Misión diaria
Cada día verás 3 tareas en Inicio y Progreso:
- Completar **2 juegos**
- Leer **1 historia**
- Ganar **30 XP**

Al cumplirlas se otorga un **bonus de 25 XP** y la insignia "Meta Diaria", y mantienes tu **racha**.

## ☁️ Autenticación con Google + sincronización (opcional)

La app funciona offline sin cuenta. Si quieres **guardar el progreso en la nube** y usarlo en varios dispositivos, puedes activar el login con Google vía **Firebase**:

1. Crea un proyecto en https://console.firebase.google.com
2. **Authentication → Sign-in method →** habilita **Google**.
3. **Firestore Database →** crea la base de datos.
4. **Authentication → Settings → Authorized domains:** añade tu dominio de Netlify.
5. Copia la config web (Project settings → Tus apps → Web) y pégala en **`src/js/firebase-config.js`**.

### 🔐 Restringir quién puede entrar (lista blanca de correos)

Hay **dos barreras** y debes configurar las dos:

**1) En el navegador** — edita `src/js/firebase-config.js` y añade los correos permitidos:

```js
export const allowedEmails = [
  "jr944180@gmail.com",
  // "otro.permitido@gmail.com",
];
```
Si dejas la lista vacía, cualquiera puede entrar. Con correos, los demás se **cierran automáticamente** y ven un aviso. (Esto es solo UX: un usuario avanzado podría saltárselo, por eso hace falta la barrera 2.)

**2) En el servidor (Firestore Rules)** — esta es la seguridad real. Pega esta misma lista de correos:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // Solo estos correos pueden leer/escribir, y solo su propio documento.
    function allowed() {
      return request.auth != null
        && request.auth.token.email_verified == true
        && request.auth.token.email in [
             'jr944180@gmail.com'
             // , 'otro.permitido@gmail.com'
           ];
    }
    match /users/{uid} {
      allow read, write: if allowed() && request.auth.uid == uid;
    }
  }
}
```

> **Escalable:** si tendrás muchos usuarios y no quieres tocar las reglas cada vez, en vez de la lista en línea crea una colección `allowlist` con un documento por correo (ID = el correo) y usa:
> `allow read, write: if request.auth.uid == uid && exists(/databases/$(database)/documents/allowlist/$(request.auth.token.email));`

> Mientras `firebase-config.js` tenga los valores `TU_...`, el login se oculta y la app sigue 100% local/offline. La config web de Firebase **no es secreta** (la seguridad la dan las reglas), por eso puede ir en el repositorio. Al iniciar sesión, el progreso local y el de la nube se **fusionan** sin perder datos.

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
│   ├── generate-icons.cjs   # Genera iconos PNG (sin dependencias)
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
   - **Build command:** `node scripts/generate-icons.cjs`
3. **Deploy site**. ¡Listo!

**Opción B — arrastrar y soltar:** sube la carpeta del proyecto en **Deploys → Drag and drop**.

> Variables de entorno: este proyecto **no necesita ninguna** ni hace llamadas externas. Si en el futuro añades alguna, configúrala en **Site settings → Environment variables** de Netlify (nunca en el código).

## 📝 Convención de commits

`feat:` nuevas funciones · `fix:` correcciones · `chore:` mantenimiento.

## 📄 Licencia

MIT.
