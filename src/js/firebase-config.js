/* ============================================================
   Configuración de Firebase (opcional)
   ------------------------------------------------------------
   Pega aquí los datos de tu proyecto:
   Firebase Console → Configuración del proyecto → Tus apps → Web (</>)

   IMPORTANTE:
   - Estos valores NO son secretos. La config web de Firebase es pública;
     la seguridad real se define con las "Reglas de Firestore".
   - Mientras los valores empiecen por "TU_", la app funciona SOLO en local
     (sin login ni sincronización) y sigue siendo 100% offline.
   - Para activar el login con Google:
       1) Crea un proyecto en https://console.firebase.google.com
       2) Authentication → Sign-in method → habilita "Google"
       3) Firestore Database → crea la base de datos
       4) Añade tu dominio de Netlify en Authentication → Settings → Authorized domains
       5) Pega la config aquí abajo
   ============================================================ */
export const firebaseConfig = {
  apiKey: "AIzaSyBi-vUMvspZ7yQELVA9QKwELxGVnT_OzNU",
  authDomain: "english-app-17680.firebaseapp.com",
  projectId: "english-app-17680",
  storageBucket: "english-app-17680.firebasestorage.app",
  messagingSenderId: "1054510351612",
  appId: "1:1054510351612:web:9f32e86c3de4dadd414379",
  measurementId: "G-H6K8JV09QS"
};

export function isFirebaseConfigured() {
  return typeof firebaseConfig.apiKey === 'string' &&
         firebaseConfig.apiKey.length > 0 &&
         !firebaseConfig.apiKey.startsWith('TU_');
}

/* ============================================================
   Lista blanca de correos permitidos
   ------------------------------------------------------------
   - Si la dejas VACÍA, cualquier cuenta de Google puede entrar.
   - Si pones uno o más correos, SOLO esos podrán iniciar sesión
     (los demás se cierran automáticamente).
   IMPORTANTE: esto es solo la primera barrera (en el navegador).
   La seguridad REAL la dan las Reglas de Firestore (ver README),
   donde debes repetir esta misma lista de correos.
   ============================================================ */
export const allowedEmails = [
  "jr944180@gmail.com",
];

export function isEmailAllowed(email) {
  if (!allowedEmails.length) return true; // sin lista => abierto
  if (!email) return false;
  return allowedEmails.map((e) => e.toLowerCase().trim()).includes(email.toLowerCase().trim());
}
