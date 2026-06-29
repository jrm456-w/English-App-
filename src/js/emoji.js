/* Visual anchors for vocabulary. Showing an image next to a word activates dual-coding
   (image + word) which is far more memorable than word + translation alone.
   We use emoji so it stays 100% offline and weightless. Abstract words simply have none. */
const MAP = {
  // numbers
  one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', six: '6️⃣', seven: '7️⃣', eight: '8️⃣', nine: '9️⃣', ten: '🔟',
  // colors
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', black: '⚫', white: '⚪', orange: '🟠', purple: '🟣', pink: '🌸', brown: '🟤', gray: '⬜',
  // family / people
  mother: '👩', father: '👨', brother: '👦', sister: '👧', son: '👦', daughter: '👧', grandmother: '👵', grandfather: '👴',
  husband: '🤵', wife: '👰', child: '🧒', family: '👨‍👩‍👧‍👦', baby: '👶', man: '👨', woman: '👩', boy: '👦', girl: '👧', friend: '🧑‍🤝‍🧑', people: '👥',
  // body
  head: '🧠', hair: '💇', eye: '👁️', nose: '👃', mouth: '👄', ear: '👂', hand: '✋', arm: '💪', leg: '🦵', foot: '🦶', heart: '❤️', face: '😊', tooth: '🦷', brain: '🧠',
  // animals
  dog: '🐶', cat: '🐱', bird: '🐦', fish: '🐟', horse: '🐴', cow: '🐮', pig: '🐷', chicken: '🐔', rabbit: '🐰', mouse: '🐭', lion: '🦁', bear: '🐻',
  // food
  bread: '🍞', milk: '🥛', egg: '🥚', apple: '🍎', rice: '🍚', coffee: '☕', tea: '🍵', fruit: '🍓', sugar: '🍬', salt: '🧂', food: '🍽️',
  cheese: '🧀', butter: '🧈', meat: '🥩', soup: '🍲', juice: '🧃', wine: '🍷', dessert: '🍰', salad: '🥗', sandwich: '🥪', pizza: '🍕', cake: '🎂',
  banana: '🍌', potato: '🥔', tomato: '🍅', water: '💧', beer: '🍺', lemonade: '🍋', ice: '🧊', vegetables: '🥦', chicken_food: '🍗',
  // drinks/kitchen
  cup: '☕', glass: '🥛', plate: '🍽️', spoon: '🥄', fork: '🍴', knife: '🔪', bottle: '🍾', bowl: '🥣', pan: '🍳', napkin: '🧻', box: '📦', bag: '🛍️',
  // weather / nature
  sun: '☀️', rain: '🌧️', snow: '❄️', wind: '🌬️', cloud: '☁️', hot: '🥵', cold: '🥶', warm: '🌤️', summer: '🏖️', winter: '⛄', spring: '🌷', autumn: '🍂',
  tree: '🌳', flower: '🌸', river: '🏞️', mountain: '⛰️', sea: '🌊', beach: '🏖️', forest: '🌲', sky: '🌌', star: '⭐', moon: '🌙', grass: '🌿', stone: '🪨',
  storm: '⛈️', fog: '🌫️', thunder: '⛈️', lightning: '⚡', umbrella: '☂️', sunny: '☀️', rainy: '🌧️', cloudy: '☁️', windy: '🌬️', snowy: '🌨️',
  // house
  house: '🏠', door: '🚪', table: '🪑', chair: '🪑', bed: '🛏️', phone: '📱', book: '📖', car: '🚗', key: '🔑', money: '💵', window: '🪟',
  kitchen: '🍳', bedroom: '🛏️', bathroom: '🚿', floor: '🟫', wall: '🧱', roof: '🏠', garden: '🌷', stairs: '🪜', lamp: '💡', mirror: '🪞', clock: '🕐',
  sofa: '🛋️', desk: '🪑', fridge: '🧊', stove: '🔥', sink: '🚰', towel: '🧖', pillow: '🛏️', blanket: '🛌', curtain: '🪟',
  // clothes
  shirt: '👕', pants: '👖', dress: '👗', shoes: '👟', hat: '🎩', jacket: '🧥', socks: '🧦', skirt: '👗', coat: '🧥', glasses: '👓', watch: '⌚',
  // transport / places
  bus: '🚌', train: '🚆', plane: '✈️', bicycle: '🚲', taxi: '🚕', subway: '🚇', ticket: '🎫', station: '🚉', bridge: '🌉', road: '🛣️',
  school: '🏫', store: '🏪', city: '🏙️', street: '🛣️', park: '🏞️', bank: '🏦', restaurant: '🍴', hotel: '🏨', hospital: '🏥', church: '⛪', market: '🛒', building: '🏢',
  airport: '🛫', flight: '✈️', luggage: '🧳', passport: '🛂',
  // time
  monday: '📅', today: '📆', tomorrow: '⏭️', yesterday: '⏮️', week: '🗓️', hour: '⏰', minute: '⏱️', morning: '🌅', noon: '🌞', evening: '🌆', midnight: '🌃',
  // sports / hobbies
  soccer: '⚽', basketball: '🏀', tennis: '🎾', swimming: '🏊', running: '🏃', ball: '⚽', team: '👥', game: '🎮', win: '🏆', player: '🏅', coach: '📣',
  read: '📖', dance: '💃', sing: '🎤', paint: '🎨', swim: '🏊', run: '🏃', cook: '👨‍🍳', travel: '✈️', photography: '📷', music: '🎵', sport: '🏅',
  // jobs
  teacher: '👩‍🏫', doctor: '👨‍⚕️', nurse: '👩‍⚕️', driver: '🚗', engineer: '👷', lawyer: '⚖️', waiter: '🧑‍🍳', farmer: '👨‍🌾', manager: '💼',
  // feelings
  happy: '😊', sad: '😢', angry: '😠', tired: '😴', excited: '🤩', worried: '😟', bored: '😑', scared: '😨', nervous: '😬', proud: '😌', surprised: '😲',
  hungry: '😋', thirsty: '🥤', sick: '🤒', fine: '🙂',
  // misc common
  fire: '🔥', emergency: '🚨', danger: '⚠️', help: '🆘', email: '📧', letter: '✉️', message: '💬', computer: '💻', screen: '🖥️', battery: '🔋',
  gift: '🎁', party: '🎉', trip: '🧳', heart_word: '❤️', time: '⏰', map: '🗺️'
};

export function emojiFor(en) {
  if (!en) return '';
  const key = en.toLowerCase().replace(/^to\s+/, '').trim().replace(/\s+/g, '_');
  if (MAP[key]) return MAP[key];
  const first = en.toLowerCase().replace(/^to\s+/, '').trim().split(/\s+/)[0];
  return MAP[first] || '';
}
