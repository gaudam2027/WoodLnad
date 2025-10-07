/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.{html,ejs}", // all your EJS templates
    "./public/**/*.js"         // any frontend JS files
  ],
  theme: {
    extend: {}, // custom colors, fonts, etc.
  },
  plugins: [],
};
