const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.randomNumber = functions.https.onRequest((request, response) => {
  const number = Math.round(Math.random() * 1000);
  response.send(number);
});

