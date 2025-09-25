const cron = require('node-cron')
const Offer = require('../../model/offerSchema')

async function updateOfferStatus(){
  const today = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ))

  await Promise.all([
    // ACtive offers
    Offer.updateMany(
      {startDate: {$lte: today}, endDate: {$gte: today}},
      {$set: {status:'active'}}
    ),
    
    //Upcoming Offers
    Offer.updateMany(
      {startDate: {$gt: today}},
      {$set: {status:'upcoming'}}
    ),

    //Expired Offers
    Offer.updateMany(
      {endDate: {$lt: today}},
      {$set: {status:'upcoming'}}
    )
  ]);
}

  function startOfferStatusCron(){
    //Run at midnight every day (12:00Am)
    cron.schedule('0 0 * * *', async ()=>{
      try {
        await updateOfferStatus();
        console.log('Offer statuses updated via cron job');
      } catch (err) {
        console.error('Cron error:', err);
      }
    })
    
    // Run immediately on server start
    updateOfferStatus()
    .then(() => console.log('Offer statuses updated on server start'))
    .catch(err => console.error('Error during initial offer update:', err));
  }

module.exports = startOfferStatusCron;