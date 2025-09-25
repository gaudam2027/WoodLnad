//***Checking Date If startDate is lesses or equal to today Date */
function isOfferActiveToday(startDate, endDate, percentage) {
  console.log(startDate, endDate, percentage,'hi')
  const today = new Date(Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  ));

  const start = new Date(startDate);
  const end = new Date(endDate);

  return percentage > 0 && start <= today && end >= today;
}

module.exports = {
  isOfferActiveToday
}