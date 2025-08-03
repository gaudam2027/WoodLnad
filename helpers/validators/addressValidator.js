// validators/addressValidator.js

function isEmpty(value) {
  return !value || value.trim() === '';
}

function isValidPincode(pincode) {
  return /^\d{5,6}$/.test(pincode);
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(phone); // Indian format: 10 digits
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAddress(data) {
  const errors = {};

  if (isEmpty(data.title)) {
    errors.title = 'Title is required';
  }

  if (isEmpty(data.addressType)) {
    errors.addressType = 'Address type is required';
  }

  if (isEmpty(data.city)) {
    errors.city = 'District/City/Town is required';
  }

  if (isEmpty(data.state)) {
    errors.state = 'State is required';
  }

  if (isEmpty(data.address)) {
    errors.address = 'Full address is required';
  }

  if (isEmpty(data.landmark)) {
    errors.landmark = 'Landmark is required';
  }

  if (!isValidPincode(data.pincode)) {
    errors.pincode = 'Invalid pincode';
  }

  if (!isValidPhone(data.phone)) {
    errors.phone = 'Invalid phone number';
  }

  if (!isEmpty(data.altPhone) && !isValidPhone(data.altPhone)) {
    errors.altPhone = 'Invalid alternate phone number';
  }

  if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

module.exports = { validateAddress };
