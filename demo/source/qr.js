// Genere qr.svg : le lien du bot avec le code d'acquisition "pitch"
// (il apparait dans l'indicateur "nouveaux utilisateurs par canal").
const fs = require("fs");
const QRCode = require("qrcode");
const URL_BOT = "https://t.me/SentyaOrientationBot?start=pitch";
QRCode.toString(URL_BOT, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#04130D", light: "#FFFFFF00" } }).then((svg) => {
  fs.writeFileSync(__dirname + "/qr.svg", svg);
  console.log("qr.svg :", URL_BOT);
});
