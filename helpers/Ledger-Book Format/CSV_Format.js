const { Parser } = require('json2csv');

// ==============================
// HELPER FUNCTIONS - DEFINE FIRST
// ==============================

function extractDateOnly(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

function extractTimeOnly(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Time';
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    return 'Invalid Time';
  }
}

function formatShippingAddressOneLine(addr) {
  if (!addr || typeof addr !== 'object') return 'N/A';
  
  const { name = '', city = '', state = '', pincode = '' } = addr;
  
  // Build "Name, City, State - PIN" while omitting empty pieces
  const parts = [];
  if (name.trim()) parts.push(name.trim());
  if (city.trim()) parts.push(city.trim());
  if (state.trim()) parts.push(state.trim());
  
  let line = parts.join(', ');
  if (pincode) line += ` - ${String(pincode).trim()}`;
  
  return line || 'N/A';
}

function formatPeriod(dateObj, filter) {
  switch (filter) {
    case 'daily':
      return `${String(dateObj.day).padStart(2, '0')}-${String(dateObj.month).padStart(2, '0')}-${dateObj.year}`;
    case 'monthly':
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[dateObj.month - 1]} ${dateObj.year}`;
    case 'yearly':
      return `${dateObj.year}`;
    default:
      return 'Unknown Period';
  }
}

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getPaymentStatus(paymentMethod, orderStatus) {
  const method = paymentMethod?.toLowerCase() || '';
  const status = orderStatus?.toLowerCase() || '';
  
  if (status.includes('delivered') || status.includes('completed')) {
    return 'Payment Confirmed';
  } else if (method === 'cod') {
    return 'Cash on Delivery';
  } else if (status.includes('pending')) {
    return 'Payment Pending';
  } else if (status.includes('failed') || status.includes('cancelled')) {
    return 'Payment Failed';
  } else if (status.includes('refund')) {
    return 'Refunded';
  } else {
    return 'Under Review';
  }
}

function getStatusDisplay(status) {
  const statusLower = status?.toLowerCase() || '';
  
  switch (statusLower) {
    case 'delivered':
      return 'Delivered ✓';
    case 'completed':
      return 'Completed ✓';
    case 'paid':
      return 'Paid ✓';
    case 'pending':
      return 'Pending ⏳';
    case 'processing':
      return 'Processing 🔄';
    case 'cancelled':
      return 'Cancelled ✗';
    case 'refunded':
      return 'Refunded ↩';
    case 'failed':
      return 'Failed ✗';
    default:
      return status || 'Unknown';
  }
}

function getPaymentDisplay(paymentMethod) {
  const methodLower = paymentMethod?.toLowerCase() || '';
  
  switch (methodLower) {
    case 'online':
    case 'card':
      return 'Online Payment 💳';
    case 'cod':
      return 'Cash on Delivery 💵';
    case 'upi':
      return 'UPI Payment 📱';
    case 'wallet':
      return 'Digital Wallet 💰';
    case 'netbanking':
      return 'Net Banking 🏦';
    default:
      return paymentMethod || 'N/A';
  }
}

function getDateRange(details) {
  if (!details || details.length === 0) return 'No data available';
  
  const dates = details
    .map(d => new Date(d.orderDate))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a - b);
  
  if (dates.length === 0) return 'Invalid dates';
  
  const startDate = dates[0].toLocaleDateString('en-IN');
  const endDate = dates[dates.length - 1].toLocaleDateString('en-IN');
  
  return startDate === endDate ? startDate : `${startDate} to ${endDate}`;
}

// ==============================
// MAIN FUNCTION
// ==============================

const generateLedgerCSV = (ledgerData, filter, res) => {
  const { details, summary } = ledgerData;
  console.log(details);

  try {
    // ==============================
    // PREPARE SUMMARY DATA
    // ==============================
    
    const summaryData = summary.map(s => {
      const period = formatPeriod(s._id, filter);
      const successRate = s.totalOrders > 0 ? ((s.paidOrders / s.totalOrders) * 100).toFixed(1) : 0;
      
      return {
        'Report Period': period,
        'Total Orders': s.totalOrders,
        'Paid Orders': s.paidOrders,
        'COD Orders': s.codOrders,
        'Refunded Orders': s.refundedOrders,
        'Total Revenue (₹)': formatCurrency(s.totalRevenue),
        'Success Rate (%)': `${successRate}%`,
        'Average Order Value (₹)': s.totalOrders > 0 ? formatCurrency(s.totalRevenue / s.totalOrders) : '0.00'
      };
    });

    // ==============================
    // PREPARE DETAILED DATA
    // ==============================
    
    const detailedData = details.map((detail, index) => ({
      'S.No': index + 1,
      'Order ID': detail.orderId ? `#${detail.orderId.slice(-8)}` : 'N/A',
      'Customer Name': detail.userName || 'Unknown',
      'Product Name': detail.itemName || 'N/A',
      'Quantity': detail.itemQty || 0,
      'Unit Price (₹)': detail.unitPrice ? formatCurrency(detail.unitPrice) : '0.00',
      'Total Amount (₹)': detail.totalAmount ? formatCurrency(detail.totalAmount) : '0.00',
      'Payment Method': detail.paymentMethod || 'N/A',
      'Payment Status': getPaymentStatus(detail.paymentMethod, detail.itemStatus),
      'Order Status': detail.itemStatus || 'N/A',
      'Order Date': extractDateOnly(detail.orderDate),
      'Order Time': extractTimeOnly(detail.orderDate),
      'Delivery Address': formatShippingAddressOneLine(detail.shippingAddress) || 'N/A',
      'Customer Phone': detail.userPhone || 'N/A', 
      'Customer Email': detail.userEmail || 'N/A' 
    }));

    // ==============================
    // CREATE HEADER INFORMATION
    // ==============================
    
    const headerInfo = [
      {
        'Field': 'Report Title',
        'Value': 'ORDER LEDGER REPORT'
      },
      {
        'Field': 'Report Type',
        'Value': filter.toUpperCase()
      },
      {
        'Field': 'Generated On',
        'Value': new Date().toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      },
      {
        'Field': 'Total Records',
        'Value': details.length.toString()
      },
      {
        'Field': 'Generated By',
        'Value': 'Order Management System'
      },
      {
        'Field': '',
        'Value': '' // Empty row for spacing
      }
    ];

    // ==============================
    // GENERATE CSV CONTENT
    // ==============================
    
    let csvContent = '';

    // Header Information Section
    const headerFields = ['Field', 'Value'];
    const headerParser = new Parser({ 
      fields: headerFields,
      quote: '"',
      delimiter: ',',
      header: true
    });
    csvContent += headerParser.parse(headerInfo);
    csvContent += '\n\n'; // Double line break

    // Summary Section
    csvContent += '=== EXECUTIVE SUMMARY ===\n';
    
    if (summaryData.length > 0) {
      const summaryFields = [
        'Report Period',
        'Total Orders',
        'Paid Orders', 
        'COD Orders',
        'Refunded Orders',
        'Total Revenue (₹)',
        'Success Rate (%)',
        'Average Order Value (₹)'
      ];
      
      const summaryParser = new Parser({ 
        fields: summaryFields,
        quote: '"',
        delimiter: ',',
        header: true
      });
      
      csvContent += summaryParser.parse(summaryData);
    } else {
      csvContent += 'No summary data available\n';
    }
    
    csvContent += '\n\n'; // Double line break

    // Detailed Transactions Section
    csvContent += '=== DETAILED TRANSACTION LEDGER ===\n';
    
    if (detailedData.length > 0) {
      const detailFields = [
        'S.No',
        'Order ID',
        'Customer Name',
        'Product Name',
        'Quantity',
        'Unit Price (₹)',
        'Total Amount (₹)',
        'Payment Method',
        'Payment Status',
        'Order Status',
        'Order Date',        // ⭐ Separate date
        'Order Time',        // ⭐ Separate time
        'Delivery Address',  // ⭐ Single address line
        'Customer Phone',
        'Customer Email'
      ];
      
      const detailParser = new Parser({ 
        fields: detailFields,
        quote: '"',
        delimiter: ',',
        header: true,
        transform: {
          'Order Status': (value) => getStatusDisplay(value),
          'Payment Method': (value) => getPaymentDisplay(value)
        }
      });
      
      csvContent += detailParser.parse(detailedData);
    } else {
      csvContent += 'No transaction data available\n';
    }

    // ==============================
    // FOOTER INFORMATION
    // ==============================
    
    csvContent += '\n\n'; // Double line break
    csvContent += '=== REPORT FOOTER ===\n';
    
    const footerInfo = [
      {
        'Information': 'Report Statistics',
        'Details': ''
      },
      {
        'Information': 'Total Transactions Processed',
        'Details': details.length.toString()
      },
      {
        'Information': 'Date Range Covered',
        'Details': getDateRange(details)
      },
      {
        'Information': 'File Generated',
        'Details': new Date().toISOString()
      },
      {
        'Information': 'System Version',
        'Details': 'v1.0.0'
      }
    ];

    const footerFields = ['Information', 'Details'];
    const footerParser = new Parser({ 
      fields: footerFields,
      quote: '"',
      delimiter: ',',
      header: true
    });
    
    csvContent += footerParser.parse(footerInfo);

    // ==============================
    // SET RESPONSE HEADERS & DOWNLOAD
    // ==============================
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `ledger-${filter}-${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Add UTF-8 BOM for proper Excel compatibility
    const BOM = '\uFEFF';
    res.send(BOM + csvContent);

  } catch (error) {
    console.error('Error generating CSV file:', error);
    res.status(500).json({ 
      error: 'Failed to generate CSV file',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = { generateLedgerCSV };
