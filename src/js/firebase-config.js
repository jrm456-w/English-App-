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
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

export function isFirebaseConfigured() {
  return typeof firebaseConfig.apiKey === 'string' &&
         firebaseConfig.apiKey.length > 0 &&
         !firebaseConfig.apiKey.startsWith('TU_');
}
