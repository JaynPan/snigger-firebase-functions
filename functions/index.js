const functions = require('firebase-functions');
const UUID = require("uuid-v4");
const express = require('express');
const cors = require('cors');
const formidable = require("formidable-serverless");
const sharp = require('sharp');

const admin = require('./adminConfig');
const checkIsAdminUser = require('./checkIsAdminUser');
const generateImageExpirationDate = require('./generateImageExpirationDate');

const app = express();
const db = admin.firestore();
const storage = admin.storage();
const bucketName = 'giggle-ff996.appspot.com';
const bucket = storage.bucket(bucketName);

app.use(cors({ origin: true }));

app.get('/', (req, res) => {
  return res.status(200).json({message:'Healthy!'});
})

app.post("/api/meme", async (req, res) => {
  const isAdmin = await checkIsAdminUser(req);

  if (!isAdmin) {
    return res.status(403).send('Unauthorized');
  }

  try {
    const form = new formidable.IncomingForm({ multiples: true });
    
    form.parse(req, async (err, fields, files) => {
      if(err) {
        return res.status(400).json({message: 'something went wrong'});
      }

      const uuid = UUID();
      const bucket = storage.bucket('gs://giggle-ff996.appspot.com');
      const { path, type, name } = files.photo;
      const splitName = name.split('.');
      const fileExtension = splitName[splitName.length - 1];
      const filename = `${uuid}.${fileExtension}`;
      const destination = `cats/${filename}`;
      let resizedImage = null;
      
      // resize and compress image
      if(fileExtension.toLowerCase() === 'png') {
        resizedImage = await sharp(path)
        .resize(720)
        .png({ quality: 30 })
        .toBuffer()
      } else {
        resizedImage = await sharp(path)
        .resize(720)
        .jpeg({ quality: 30 })
        .toBuffer()
      }

      const file = bucket.file(destination)

      await file.save(resizedImage, {
        destination,
        metadata: {
          contentType: type,
        }
      });

      await db.collection("photos").doc().create({
        createdAt: Date.now(),
        name: destination,
      });

      return res.status(200).json({message: 'ok'})
    })
  } catch(err) {
    functions.logger.error(err)
    return res.status(400).json({message: 'something went wrong'});
  }
})

app.get('/api/meme/:id', async (req, res) => {
  try {
    const reqDoc = db.collection('photos').doc(req.params.id);
    const response = await reqDoc.get();
    const photoMetadata = response.data();

    return res.status(200).json(photoMetadata);
  } catch(err) {
    return res.status(400).json({message: 'something went wrong'});
  }
})

app.delete('/api/meme', async (req, res) => {
  const isAdmin = await checkIsAdminUser(req);

  if (!isAdmin) {
    return res.status(403).send('Unauthorized');
  }

  const { documentId, filePath } = req.query;

  if(!documentId || !filePath) return res.status(400).json({ message: 'params error' });

  try {
    const reqDoc = db.collection('photos').doc(documentId);
    const file = bucket.file(filePath);

    await reqDoc.delete();
    await file.delete();
    return res.status(200).json({ documentId });
  } catch(err) {
    functions.logger.error(err);
    return res.status(400).json({ message: 'something went wrong' });
  }
})

app.get('/api/randomMeme', async (req, res) => {
  try {
    const collection = db.collection('photos');
    const snapshot = await collection.get();
    const randomIndex = Math.floor(Math.random() * snapshot.size);
    const randomDocument = snapshot.docs[randomIndex].data();
    const filePath = randomDocument.name;
    const file = bucket.file(filePath);
    const signedURLconfig = { action: 'read', expires: generateImageExpirationDate() };
    const signedURLArray = await file.getSignedUrl(signedURLconfig);
    const url = signedURLArray[0];

    return res.status(200).json({ url, id: filePath });
  } catch(err) {
    return res.status(400).json({message: 'something went wrong'});
  }
})

app.get('/api/photos', async (req, res) => {
  try {
    const file = bucket.file(req.query.filePath);
    const signedURLconfig = { action: 'read', expires: generateImageExpirationDate() };
    const signedURLArray = await file.getSignedUrl(signedURLconfig);
    const url = signedURLArray[0];

    return res.status(200).json({ url });
  } catch(err) {  
    return res.status(400).json({message: 'something went wrong'});
  }
})

app.get('/api/memeList', async (req, res) => {
  const isAdmin = await checkIsAdminUser(req);

  if (!isAdmin) {
    return res.status(403).send('Unauthorized');
  }

  try {
    const collection = db.collection('photos');
    const snapshot = await collection.orderBy('createdAt', 'desc').get();
    const promises = [];

    snapshot.forEach((document) => {
        const filePath = document.data().name;
        const file = bucket.file(filePath);
        
        promises.push({ file, filePath, documentId: document.id });
    });
    const result = await Promise.all(promises.map(async({ file, filePath, documentId }) => {
      try {
        const signedURLArray = await file.getSignedUrl({ action: 'read', expires: generateImageExpirationDate() });
        const url = signedURLArray[0];

        return { url, filePath, documentId };
      } catch(err) {
        functions.logger.error(err)
        throw new Error('wrong');
      }
    }));
    
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ message: 'Something went wrong' });
  }
});

exports.app = functions.https.onRequest(app);