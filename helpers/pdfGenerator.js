const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Read logo and convert to base64
const logoPath = path.resolve(__dirname, '../public/images/logo.png'); // adjust path as needed
const logoBase64 = fs.readFileSync(logoPath).toString('base64');
const logoDataURL = `data:image/png;base64,${logoBase64}`;

//order item image path
function getProductImageBase64(filename) {
  try {
    const absolutePath = path.resolve(__dirname, '../public/uploads/product-images', filename);
    const data = fs.readFileSync(absolutePath).toString('base64');
    return `data:image/png;base64,${data}`;
  } catch (err) {
    console.warn('Product image not found:', filename);
    return ''; // fallback if file missing
  }
}

const generateInvoicePDF = async (order, user, invoiceType = 'full', item = null) => {
  let browser = null;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-running-insecure-content'
      ],
      timeout: 60000,
      protocolTimeout: 240000
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1
    });

    // Generate the complete HTML with inline styles
    const html = generateInvoiceHTML(order, user, invoiceType, item);

    // Set content and wait for everything to load
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });

    // Wait for images to load
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images, img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', reject);
            setTimeout(reject, 10000); // 10 second timeout
          });
        })
      );
    });

    // Additional wait for stability
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      displayHeaderFooter: false
    });

    return pdfBuffer;

  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

// HTML Generator Function
function generateInvoiceHTML(order, user, invoiceType, item) {
  // Helper functions
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-IN');
  };

  const getPaymentMethodName = (method) => {
    switch (method) {
      case 'COD': return 'Cash on Delivery';
      case 'UPI': return 'UPI Payment';
      case 'CARD': return 'Credit/Debit Card';
      default: return method;
    }
  };

  // Generate invoice number
  const invoiceNumber = (invoiceType === 'item' && item) 
    ? `INV-${order.orderId}-${item._id.toString().slice(-6).toUpperCase()}`
    : `INV-${order.orderId}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice - ${invoiceNumber}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    @media print {
      body * { visibility: hidden; }
      .invoice-container, .invoice-container * { visibility: visible; }
      .invoice-container { position: absolute; left: 0; top: 0; width: 100%; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    .invoice-container { background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
    .invoice-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .invoice-table th { background-color: #f8f9fa; font-weight: 600; }
    .invoice-table td, .invoice-table th { padding: 12px; border-bottom: 1px solid #e9ecef; }
    .total-section { background-color: #f8f9fa; border-left: 4px solid #667eea; }
    .custom-gradient { background: linear-gradient(135deg, #242833 0%, #a4a3a5 100%); }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body class="bg-gray-50">
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="container mx-auto px-4 max-w-4xl">
      <div class="invoice-container bg-white rounded-lg overflow-hidden">
        <!-- Invoice Header -->
        <div class="invoice-header p-8 custom-gradient">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold mb-2">INVOICE</h1>
              <p class="text-white-100">Professional Invoice Document</p>
            </div>
            <div class="text-right">
              <!-- Company Logo -->
              <div class="w-24 h-24 flex items-center justify-center mb-4">
                <img src="${logoDataURL}" alt="WoodLand Logo" class="w-full h-full object-contain" />
              </div>
              <h2 class="text-xl font-semibold">WoodLand</h2>
              <p class="text-blue-100 text-sm">www.woodland.com</p>
            </div>
          </div>
        </div>

        <!-- Invoice Details -->
        <div class="p-8">
          <div class="grid md:grid-cols-2 gap-8 mb-8">
            <!-- Invoice Info -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Invoice Details</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Invoice Number:</span>
                  <span class="font-medium">${invoiceNumber}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Invoice Date:</span>
                  <span class="font-medium">${formatDate(new Date())}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Order ID:</span>
                  <span class="font-medium">#${order.orderId}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Order Date:</span>
                  <span class="font-medium">${formatDate(order.createdOn)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Payment Method:</span>
                  <span class="font-medium">${getPaymentMethodName(order.paymentMethod)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Payment Status:</span>
                  <span class="font-medium capitalize ${order.paymentStatus === 'paid' ? 'text-green-600' : 
                    order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'}">${order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}</span>
                </div>
              </div>
            </div>

            <!-- Company Info -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">From</h3>
              <div class="text-sm text-gray-600 space-y-1">
                <p class="font-medium text-gray-800">WoodLand</p>
                <p>Ernakulam</p>
                <p>Kochi, State 673101</p>
                <p>India</p>
                <p class="mt-2">
                  <span class="font-medium">Email:</span> agwoodland2027@gmail.com<br>
                  <span class="font-medium">Phone:</span> +91 9567826814<br>
                  <span class="font-medium">GST:</span> 12ABCDE3456F7GH
                </p>
              </div>
            </div>
          </div>

          <!-- Customer Info & Items Table -->
          <div class="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Bill To</h3>
              <div class="text-sm text-gray-600 space-y-1">
                <p class="font-medium text-gray-800">${user.name || 'N/A'}</p>
                <p>${user.email || 'N/A'}</p>
                ${user.phone ? `<p>${user.phone}</p>` : ''}
              </div>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Ship To</h3>
              <div class="text-sm text-gray-600 space-y-1">
                <p class="font-medium text-gray-800">${order.shippingAddress?.title || 'N/A'}</p>
                <p>${order.shippingAddress?.address || 'N/A'}</p>
                ${order.shippingAddress?.addressLine2 ? `<p>${order.shippingAddress.addressLine2}</p>` : ''}
                <p>${order.shippingAddress?.city || 'N/A'}, ${order.shippingAddress?.state || 'N/A'} ${order.shippingAddress?.pincode || 'N/A'}</p>
                <p>${order.shippingAddress?.country || 'India'}</p>
                ${order.shippingAddress?.phone ? `<p class="mt-2"><span class="font-medium">Phone:</span> ${order.shippingAddress.phone}</p>` : ''}
              </div>
            </div>
          </div>

          <div class="mb-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">${invoiceType === 'item' ? 'Item Details' : 'Order Items'}</h3>
            <div class="overflow-x-auto">
              <table class="invoice-table w-full border-collapse">
                <thead>
                  <tr>
                    <th class="text-left">Item</th>
                    <th class="text-left">SKU</th>
                    <th class="text-center">Qty</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${generateItemRows(order, invoiceType, item, formatCurrency)}
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex justify-end mb-8">
            <div class="w-full max-w-sm">
              <div class="total-section p-6 rounded-lg" style="border-left:4px solid #8896a2">
                ${generateTotalsSection(order, invoiceType, item, formatCurrency)}
              </div>
            </div>
          </div>

          <div class="border-t pt-8">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Terms & Conditions</h3>
            <div class="text-sm text-gray-600 space-y-2">
              <p>1. Payment is due within 30 days of invoice date.</p>
              <p>2. Returns are accepted within 7 days of delivery for eligible items.</p>
              <p>3. Items must be in original condition with tags attached for returns.</p>
              <p>4. Shipping charges are non-refundable unless the return is due to our error.</p>
              <p>5. For any queries, please contact our customer support team.</p>
            </div>
          </div>

          <div class="border-t mt-8 pt-6 text-center">
            <div class="text-sm text-gray-600">
              <p class="mb-2">Thank you for your business!</p>
              <p>This is a computer-generated invoice and does not require a signature.</p>
              <p class="mt-4 text-xs">Generated on ${formatDateTime(new Date())}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// Generate item rows
function generateItemRows(order, invoiceType, item, formatCurrency) {
  if (invoiceType === 'item' && item) {
    const imgSrc = item.product?.images?.length
      ? getProductImageBase64(item.product.images[0])
      : '';
      
    return `
      <tr>
        <td>
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
              ${imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-contain" />` : `<span class="text-xs text-gray-500">IMG</span>`}
            </div>
            <div>
              <p class="font-medium text-gray-800">${item.product?.productName || 'N/A'}</p>
              <p class="text-sm text-gray-600">${item.product?.category?.name || 'N/A'}</p>
            </div>
          </div>
        </td>
        <td class="text-gray-600">${item.product?.sku || 'N/A'}</td>
        <td class="text-center">${item.quantity || 0}</td>
        <td class="text-right">₹${formatCurrency(item.price || 0)}</td>
        <td class="text-right font-medium">₹${formatCurrency((item.quantity || 0) * (item.price || 0))}</td>
      </tr>
    `;
  } else {
    return order.orderitems.map(orderItem => {
      const imgSrc = orderItem.product?.images?.length
        ? getProductImageBase64(orderItem.product.images[0])
        : '';
        
      return `
        <tr>
          <td>
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                ${imgSrc ? `<img src="${imgSrc}" class="w-full h-full object-contain" />` : `<span class="text-xs text-gray-500">IMG</span>`}
              </div>
              <div>
                <p class="font-medium text-gray-800">${orderItem.product?.productName || 'N/A'}</p>
                <p class="text-sm text-gray-600">${orderItem.product?.category?.name || 'N/A'}</p>
              </div>
            </div>
          </td>
          <td class="text-gray-600">${orderItem.product?.sku || 'N/A'}</td>
          <td class="text-center">${orderItem.quantity || 0}</td>
          <td class="text-right">₹${formatCurrency(orderItem.price || 0)}</td>
          <td class="text-right font-medium">₹${formatCurrency((orderItem.quantity || 0) * (orderItem.price || 0))}</td>
        </tr>
      `;
    }).join('');
  }
}

// Generate totals section
function generateTotalsSection(order, invoiceType, item, formatCurrency) {
  if (invoiceType === 'item' && item) {
    const itemTotal = (item.quantity || 0) * (item.price || 0);
    return `
      <div class="space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Subtotal:</span>
          <span class="font-medium">₹${formatCurrency(itemTotal)}</span>
        </div>
        <div class="border-t pt-3">
          <div class="flex justify-between text-lg font-bold">
            <span class="text-gray-800">Total Amount:</span>
            <span class="text-gray-800">₹${formatCurrency(itemTotal)}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Subtotal:</span>
          <span class="font-medium">₹${formatCurrency(order.totalPrice || 0)}</span>
        </div>
        ${order.discountAmount && order.discountAmount > 0 ? `
          <div class="flex justify-between text-sm text-green-600">
            <span>Discount:</span>
            <span>-₹${formatCurrency(order.discountAmount)}</span>
          </div>
        ` : ''}
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Shipping:</span>
          <span class="font-medium ${(!order.shippingCost || order.shippingCost === 0) ? 'text-green-600' : ''}">
            ${(!order.shippingCost || order.shippingCost === 0) ? 'Free' : `₹${formatCurrency(order.shippingCost)}`}
          </span>
        </div>
        ${order.taxAmount && order.taxAmount > 0 ? `
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Tax:</span>
            <span class="font-medium">₹${formatCurrency(order.taxAmount)}</span>
          </div>
        ` : ''}
        <div class="border-t pt-3">
          <div class="flex justify-between text-lg font-bold">
            <span class="text-gray-800">Total Amount:</span>
            <span class="text-gray-800">₹${formatCurrency(order.finalAmount || 0)}</span>
          </div>
        </div>
      </div>
    `;
  }
}

module.exports = { generateInvoicePDF };
