/* Mission Maths — config.js : adresse du projet Firebase. Ce bloc n'est pas secret : la sécurité vient des règles (firestore.rules)
   et de la clé de famille, qui n'est jamais dans le code. */
(function (G) {
  "use strict";
  const MM = G.MM || (G.MM = {});
  MM.config = {
    firebase: {
      apiKey: "AIzaSyDGO911-lwSLcuVgwwFU6zRjjPooO6Rpjo",
      authDomain: "mission-maths-3ce77.firebaseapp.com",
      projectId: "mission-maths-3ce77",
      storageBucket: "mission-maths-3ce77.firebasestorage.app",
      messagingSenderId: "103852348208",
      appId: "1:103852348208:web:8b410edebf41886ba0aef5"
    },
    firebaseVersion: "13.3.0"
  };
  if (typeof module !== "undefined" && module.exports) module.exports = MM;
})(typeof globalThis !== "undefined" ? globalThis : this);
