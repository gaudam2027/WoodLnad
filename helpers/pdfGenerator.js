const puppeteer = require('puppeteer');

/**
 * Generates a PDF from an HTML string using Puppeteer.
 * @param {string} htmlContent - The full HTML content to render.
 * @returns {Buffer} - The generated PDF as a Buffer.
 */
async function generatePDF(htmlContent) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdfBuffer;
}

module.exports = generatePDF;
