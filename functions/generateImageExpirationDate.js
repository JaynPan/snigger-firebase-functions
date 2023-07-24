const dayjs = require('dayjs');

function generateImageExpirationDate() {
  const futureDate = dayjs().add(2, 'day');
  const formattedDate = futureDate.format('MM-DD-YYYY');

  return formattedDate;
}

module.exports = generateImageExpirationDate;