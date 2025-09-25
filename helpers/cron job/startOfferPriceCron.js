const cron = require('node-cron');
const {applyBestOffersToAllProducts} = require('../../helpers/offer-helpers/offerPrice');

function startOfferPriceCron(){
    // Runs at Mid-Night Every day (12:00AM)
    cron.schedule('0 0 * * *', async () => {
    try {
      await applyBestOffersToAllProducts();
      console.log('Product prices updated via cron job');
    } catch (err) {
      console.error(' Cron error (price update):', err);
    }
   });

   // Runs Immedaitly when Server Starts
    applyBestOffersToAllProducts()
    .then(() => console.log('Product prices updated on server start'))
    .catch(err => console.error('Error during initial price update:', err));
}

module.exports = startOfferPriceCron;