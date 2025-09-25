const mongoose = require('mongoose');

function offerValidator(type, targetId, offerPercentage, startDate, endDate, offerName) {
  const errors = [];

  // Validate offer name
  if (!offerName || offerName.trim() === '') {
    errors.push('Offer name is required.');
  }

  // Validate type
  if (!type || !['Product', 'Category'].includes(type)) {
    errors.push('Type must be either "product" or "category".');
  }

  // Validate targetId
  if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
    errors.push('A valid target ID is required.');
  }

  // Validate offer percentage
  if (typeof offerPercentage !== 'number' || offerPercentage <= 0 || offerPercentage > 100) {
    errors.push('Offer percentage must be a number between 1 and 100.');
  }

  // Validate dates
  if (!startDate || !endDate) {
    errors.push('Start date and end date are required.');
  } else {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('Invalid date format.');
    } else {
      if (start >= end) {
        errors.push('End date must be after start date.');
      }
      if (end < now) {
        errors.push('End date cannot be in the past.');
      }
    }
  }

  return errors;
}

module.exports = { offerValidator };
