// helpers/contactValidator.js
const isValidName = (name) => /^[A-Za-z\s]+$/.test(name.trim());

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

const isValidPhone = (phone) => {
  if (!/^\d{10}$/.test(phone)) return false; // must be 10 digits
  // reject if all digits are same (e.g., 1111111111)
  return !/^(\d)\1{9}$/.test(phone);
};

const isValidSubject = (subject) => typeof subject === 'string' && subject.trim().length > 0;

const isValidMessage = (message) => typeof message === 'string' && message.trim().length > 15;

const validateContactForm = (data) => {
  const errors = {};

  if (!isValidName(data.firstName)) errors.firstName = 'First name can contain only letters and spaces.';
  if (!isValidName(data.lastName)) errors.lastName = 'Last name can contain only letters and spaces.';
  if (!isValidEmail(data.email)) errors.email = 'Invalid email address.';
  if (!isValidPhone(data.phone)) errors.phone = 'Phone must be 10 digits and not all same numbers.';
  if (!isValidSubject(data.subject)) errors.subject = 'Subject is required.';
  if (!isValidMessage(data.message)) errors.message = 'Message must be at least 15 characters.';

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

module.exports = validateContactForm;
