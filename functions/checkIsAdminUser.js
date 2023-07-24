const admin = require('./adminConfig');

async function checkIsAdminUser(req) {
  if ((!req.headers.authorization || !req.headers.authorization.startsWith('Bearer '))) {
    return false;
  }

  let idToken;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else {
    return false;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    const adminUserUid = 'Trzwveh45PYK2N82WnDMDdgd3Dj1';

    if(decodedIdToken.uid !== adminUserUid) return false;

    req.user = decodedIdToken;
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = checkIsAdminUser;