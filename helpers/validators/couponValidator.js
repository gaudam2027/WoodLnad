function validateCoupon(data,method) {
  const errors = [];

  // 1. Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push("Coupon name is required");
  } else if (data.name.length > 15) {
    errors.push("Coupon name must not exceed 15 characters");
  }

  // 2. Discount (offerPrice)
  if (isNaN(data.offerPrice) || Number(data.offerPrice) <= 0) {
    errors.push("Discount amount must be greater than 0");
  }

  // 3. Minimum purchase
  if (isNaN(data.minimumPrice) || Number(data.minimumPrice) <= Number(data.offerPrice)) {
    errors.push("Minimum purchase must be greater than discount amount");
  }

  // 4. Usage limit
  if (data.usageLimit !== null && data.usageLimit !== undefined) {
    if (isNaN(data.usageLimit) || Number(data.usageLimit) < 0) {
      errors.push("Usage limit must be a valid number greater than or equal to 0");
    }
  }

  // 5. Description
  if (!data.description || data.description.trim().length < 10) {
    errors.push("Description must be at least 10 characters long");
  }

  // 6. Dates
  const now = new Date().setHours(0, 0, 0, 0);
  const startDate = new Date(data.startOn);
  const endDate = new Date(data.expireOn);

  if(method!='edit'){
    console.log(method,'lo')
  if (isNaN(startDate.getTime())) {
    errors.push("Start date is invalid");
  } else if (startDate < now) {
    errors.push("Start date cannot be in the past");
  }

  if (isNaN(endDate.getTime())) {
    errors.push("End date is invalid");
  } else if (endDate <= startDate) {
    errors.push("End date must be after the start date");
  }
  }

  return errors;
}

module.exports = {validateCoupon}