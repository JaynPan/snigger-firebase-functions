const admin = require('./adminConfig');
const {ADMIN_USER_UID} = require('./constants.json');

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

    if(decodedIdToken.uid !== ADMIN_USER_UID) return false;

    req.user = decodedIdToken;
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = checkIsAdminUser;