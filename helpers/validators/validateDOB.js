//Validate Date Of Birth
function validateDOB(dobString, minAge = 13) {
  const dob = new Date(dobString);
  const today = new Date();

  // Invalid date
  if (isNaN(dob.getTime())) {
    return { valid: false, message: "Invalid date format for DOB." };
  }

  // Future date check
  if (dob > today) {
    return { valid: false, message: "Date of Birth cannot be in the future." };
  }

  // Age check
  const age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear = (
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  );
  const actualAge = hasHadBirthdayThisYear ? age : age - 1;

  if (actualAge < minAge) {
    return { valid: false, message: `You must be at least ${minAge} years old.` };
  }

  // Passed all checks
  return { valid: true, date: dob };
}

module.exports = { validateDOB };