const functions = require('firebase-functions');
const admin = require('firebase-admin');

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
const db = admin.firestore();
const storage = admin.storage();
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors({ origin: true }));

app.get('/', (req, res) => {
  return res.status(200).send('Healthy!');
})

app.post("/api/meme", upload.single("file"), async (req, res) => {
  try {
    // save image to storage
    const myBucket = storage.bucket('giggle-ff996.appspot.com');
    const file = myBucket.file('test.png');

    file.save(req.file, async (err) => {
      if (err) {
        return res.status(400).send('something went wrong');
      }

      // save metadata
      const result = await db.collection("photos").doc().create({
        id: Date.now(),
        name: req.body.name
      });

      functions.logger.log(result)
      return res.status(200).send('ok')
    });

    // // save metadata
    // const result = await db.collection("photos").doc().create({
    //   id: Date.now(),
    //   name: req.body.name
    // });

    // functions.logger.log(result)
    // return res.status(200).send('ok')
  } catch(err) {
    functions.logger.error(err)
    return res.status(400).send('something went wrong');
  }
})

app.get('/api/meme/:id', async (req, res) => {
  try {
    const reqDoc = db.collection('photos').doc(req.params.id);
    const response = await reqDoc.get();
    const photoMetadata = response.data();

    return res.status(200).json(photoMetadata);
  } catch(err) {
    return res.status(400).send('something went wrong');
  }
})

app.get('/api/randomMeme', async (req, res) => {
  try {
    const collection = db.collection('photos');
    const snapshot = await collection.get();
    const randomIndex = Math.floor(Math.random() * snapshot.size);
    const randomDocument = snapshot.docs[randomIndex].data();

    return res.status(200).json(randomDocument);
  } catch(err) {
    return res.status(400).send('something went wrong');
  }
})

app.get('/api/photos/:id', async (req, res) => {
  try {
    const bucket = storage.bucket("giggle-ff996.appspot.com");
    const file = bucket.file("foo.png");

    const signedURLconfig = { action: 'read', expires: '01-01-2030' };

    const signedURLArray = await file.getSignedUrl(signedURLconfig);
    const url = signedURLArray[0];

    return res.status(200).send(url);
  } catch(err) {  
    return res.status(400).send('something went wrong');
  }
})

exports.app = functions.https.onRequest(app);