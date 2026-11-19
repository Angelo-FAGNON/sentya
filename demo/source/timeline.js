// Minutage commun a l'image et au son (secondes). 120 BPM : un temps = 0,5 s.
// Les coupes de scene tombent sur des temps forts.
const TL = {
  DUR: 60,
  FPS: 30,
  // scenes
  problems: 4.0,
  wipe: 7.5,
  logo: 8.0,
  phoneStart: 10.5,
  p1: 10.9,
  p2: 19.0,
  p3: 26.5,
  phoneOut: 34.4,
  features: 35.0,
  promise: 42.5,
  finale: 49.5,
  lockup: 53.3,
  // problemes (accroche)
  problemLines: [4.4, 5.1, 5.8],
  // messages du bot et du jeune, dans l'ordre du fil
  msgs: [11.1, 11.9, 14.0, 15.7, 16.6, 17.4, 19.1, 19.8, 20.15, 23.3, 26.6, 27.0, 27.45, 27.9, 28.6, 29.3, 30.3, 32.3, 33.4],
  voice: [12.0, 13.6],
  taps: { oui: 15.3, piste: 22.6, choisir: 25.2, fait: 33.1 },
  chips: [14.2, 14.36, 14.52],
  cv: { in: 16.5, scan: 16.8, del: 17.4 },
  cards: [20.1, 20.35, 20.6],
  steps: [27.0, 27.45, 27.9],
  shield: 30.3,
  notif: 31.6,
  featureTiles: [35.5, 35.85, 36.2, 36.55],
  stack: 38.6,
  promiseLines: [43.0, 44.3, 45.6, 46.9],
  impacts: [8.0, 19.0, 26.5, 35.0, 42.5, 49.5, 53.3],
};
if (typeof module !== "undefined") module.exports = TL;
