/* Bilingual UI strings (Spanish / English). */
import { getState, setState } from './store.js';

const DICT = {
  es: {
    'nav.home': 'Inicio', 'nav.learn': 'Aprender', 'nav.games': 'Juegos',
    'nav.progress': 'Progreso', 'nav.settings': 'Ajustes',
    'install.text': 'Instala EngFlow en tu dispositivo', 'install.button': 'Instalar',
    'home.greeting': 'Hola, ¡a practicar!', 'home.subtitle': 'Aprende inglés un poco cada día.',
    'home.continue': 'Continuar aprendiendo', 'home.level': 'Nivel', 'home.xp': 'XP',
    'home.streak': 'Racha', 'home.days': 'días', 'home.startGame': 'Jugar ahora',
    'home.quickGames': 'Juegos rápidos', 'home.recentBadges': 'Insignias recientes',
    'learn.title': 'Lecciones', 'learn.vocab': 'Vocabulario', 'learn.grammar': 'Gramática',
    'learn.practice': 'Practicar', 'learn.examples': 'Ejemplos',
    'games.title': 'Juegos', 'games.choose': 'Elige un juego', 'games.unit': 'Unidad',
    'progress.title': 'Tu progreso', 'progress.overall': 'Progreso del nivel',
    'progress.badges': 'Insignias', 'progress.stats': 'Estadísticas',
    'settings.title': 'Ajustes', 'settings.theme': 'Modo oscuro', 'settings.language': 'Idioma de la app',
    'settings.level': 'Cambiar nivel', 'settings.reset': 'Reiniciar progreso',
    'settings.retakeQuiz': 'Repetir prueba de nivel', 'settings.reset.confirm': '¿Borrar todo tu progreso?',
    'settings.about': 'Acerca de',
    'quiz.title': 'Prueba de nivel', 'quiz.intro': 'Responde 15 preguntas para encontrar tu nivel ideal.',
    'quiz.start': 'Empezar', 'quiz.question': 'Pregunta', 'quiz.of': 'de',
    'quiz.next': 'Siguiente', 'quiz.finish': 'Ver resultado', 'quiz.listen': 'Escuchar audio',
    'quiz.result': '¡Listo! Tu nivel es', 'quiz.score': 'Aciertos', 'quiz.go': 'Empezar a aprender',
    'common.correct': '¡Correcto!', 'common.wrong': 'Incorrecto', 'common.check': 'Comprobar',
    'common.next': 'Siguiente', 'common.again': 'Jugar otra vez', 'common.back': 'Volver',
    'common.listen': '🔊 Escuchar', 'common.score': 'Puntuación', 'common.xpEarned': 'XP ganado',
    'common.time': 'Tiempo', 'common.complete': '¡Juego completado!', 'common.start': 'Empezar',
    'common.speak': '🎤 Hablar', 'common.flip': 'Toca para girar', 'common.know': 'La sé',
    'common.dontKnow': 'Repasar', 'common.type': 'Escribe lo que escuchas',
    'game.word_match': 'Une las palabras', 'game.fill_blank': 'Completa la frase',
    'game.listening_echo': 'Eco auditivo', 'game.flashcard': 'Tarjetas',
    'game.sentence_builder': 'Ordena la frase', 'game.story_cloze': 'Completa el texto',
    'game.speaking_mirror': 'Espejo de voz',
    'speak.prompt': 'Di esta frase en voz alta:', 'speak.listening': 'Escuchando…',
    'speak.unsupported': 'Tu navegador no soporta reconocimiento de voz. Practica leyendo en voz alta.',
    'speak.heard': 'Escuché', 'badge.unlocked': '¡Insignia desbloqueada!',
    'nav.stories': 'Historias', 'stories.title': 'Historias cortas',
    'stories.subtitle': 'Aprende leyendo y escuchando inglés real.',
    'stories.continue': 'Seguir leyendo', 'stories.read': '✅ Leída',
    'story.modeRead': '📖 Leer', 'story.modeShadow': '🎧 Shadowing',
    'story.playAll': '▶️ Escuchar todo', 'story.stop': '⏹️ Parar',
    'story.showEs': 'Ver traducción', 'story.hideEs': 'Ocultar',
    'story.tapWord': 'Toca cualquier palabra para oírla y traducirla.',
    'story.shadowHint': 'Escucha la frase y repítela en voz alta. Luego pulsa el micrófono.',
    'story.repeat': '🎤 Repetir', 'story.next': 'Siguiente frase',
    'story.toQuiz': 'Comprobar comprensión →', 'story.finish': 'Terminar historia',
    'story.quizTitle': 'Preguntas de comprensión', 'story.glossary': 'Vocabulario clave'
  },
  en: {
    'nav.home': 'Home', 'nav.learn': 'Learn', 'nav.games': 'Games',
    'nav.progress': 'Progress', 'nav.settings': 'Settings',
    'install.text': 'Install EngFlow on your device', 'install.button': 'Install',
    'home.greeting': "Hi, let's practice!", 'home.subtitle': 'Learn a little English every day.',
    'home.continue': 'Continue learning', 'home.level': 'Level', 'home.xp': 'XP',
    'home.streak': 'Streak', 'home.days': 'days', 'home.startGame': 'Play now',
    'home.quickGames': 'Quick games', 'home.recentBadges': 'Recent badges',
    'learn.title': 'Lessons', 'learn.vocab': 'Vocabulary', 'learn.grammar': 'Grammar',
    'learn.practice': 'Practice', 'learn.examples': 'Examples',
    'games.title': 'Games', 'games.choose': 'Choose a game', 'games.unit': 'Unit',
    'progress.title': 'Your progress', 'progress.overall': 'Level progress',
    'progress.badges': 'Badges', 'progress.stats': 'Statistics',
    'settings.title': 'Settings', 'settings.theme': 'Dark mode', 'settings.language': 'App language',
    'settings.level': 'Change level', 'settings.reset': 'Reset progress',
    'settings.retakeQuiz': 'Retake placement test', 'settings.reset.confirm': 'Erase all your progress?',
    'settings.about': 'About',
    'quiz.title': 'Placement test', 'quiz.intro': 'Answer 15 questions to find your ideal level.',
    'quiz.start': 'Start', 'quiz.question': 'Question', 'quiz.of': 'of',
    'quiz.next': 'Next', 'quiz.finish': 'See result', 'quiz.listen': 'Play audio',
    'quiz.result': 'Done! Your level is', 'quiz.score': 'Correct', 'quiz.go': 'Start learning',
    'common.correct': 'Correct!', 'common.wrong': 'Wrong', 'common.check': 'Check',
    'common.next': 'Next', 'common.again': 'Play again', 'common.back': 'Back',
    'common.listen': '🔊 Listen', 'common.score': 'Score', 'common.xpEarned': 'XP earned',
    'common.time': 'Time', 'common.complete': 'Game complete!', 'common.start': 'Start',
    'common.speak': '🎤 Speak', 'common.flip': 'Tap to flip', 'common.know': 'I know it',
    'common.dontKnow': 'Review', 'common.type': 'Type what you hear',
    'game.word_match': 'Match the words', 'game.fill_blank': 'Fill the blank',
    'game.listening_echo': 'Listening echo', 'game.flashcard': 'Flashcards',
    'game.sentence_builder': 'Sentence builder', 'game.story_cloze': 'Story cloze',
    'game.speaking_mirror': 'Speaking mirror',
    'speak.prompt': 'Say this sentence out loud:', 'speak.listening': 'Listening…',
    'speak.unsupported': 'Your browser does not support speech recognition. Practice by reading aloud.',
    'speak.heard': 'I heard', 'badge.unlocked': 'Badge unlocked!',
    'nav.stories': 'Stories', 'stories.title': 'Short stories',
    'stories.subtitle': 'Learn by reading and listening to real English.',
    'stories.continue': 'Keep reading', 'stories.read': '✅ Read',
    'story.modeRead': '📖 Read', 'story.modeShadow': '🎧 Shadowing',
    'story.playAll': '▶️ Listen to all', 'story.stop': '⏹️ Stop',
    'story.showEs': 'Show translation', 'story.hideEs': 'Hide',
    'story.tapWord': 'Tap any word to hear and translate it.',
    'story.shadowHint': 'Listen to the sentence and repeat it aloud. Then tap the mic.',
    'story.repeat': '🎤 Repeat', 'story.next': 'Next sentence',
    'story.toQuiz': 'Check comprehension →', 'story.finish': 'Finish story',
    'story.quizTitle': 'Comprehension questions', 'story.glossary': 'Key vocabulary'
  }
};

export function t(key) {
  const lang = getState().lang;
  return (DICT[lang] && DICT[lang][key]) || (DICT.es[key]) || key;
}

export function setLang(lang) {
  setState({ lang });
  applyTranslations();
}

/* Translate any element carrying data-i18n in the static shell. */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.documentElement.lang = getState().lang;
}
