const ExcelJS = require('exceljs');

const generateLedgerExcel = async (ledgerData, filter, res) => {
  const { details, summary } = ledgerData;

  try {
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Order Management System';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ==============================
    // SUMMARY WORKSHEET
    // ==============================
    
    const summarySheet = workbook.addWorksheet('Summary', {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'portrait',
        margins: {
          left: 0.7, right: 0.7,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      }
    });

    // Define column widths for summary
    summarySheet.columns = [
      { width: 20 }, // Period
      { width: 15 }, // Total Orders
      { width: 15 }, // Paid Orders
      { width: 15 }, // COD Orders
      { width: 15 }, // Refunded Orders
      { width: 20 }, // Total Revenue
      { width: 15 }  // Success Rate
    ];

    // Title Row
    summarySheet.mergeCells('A1:G1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'ORDER LEDGER SUMMARY REPORT';
    titleCell.font = { 
      name: 'Calibri', 
      size: 18, 
      bold: true, 
      color: { argb: 'FF2C3E50' } 
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F4FD' }
    };

    // Subtitle Row
    summarySheet.mergeCells('A2:G2');
    const subtitleCell = summarySheet.getCell('A2');
    subtitleCell.value = `Report Period: ${filter.toUpperCase()} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
    subtitleCell.font = { 
      name: 'Calibri', 
      size: 12, 
      italic: true,
      color: { argb: 'FF34495E' }
    };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header Row
    const headers = ['Period', 'Total Orders', 'Paid Orders', 'COD Orders', 'Refunded Orders', 'Total Revenue (₹)', 'Success Rate (%)'];
    
    summarySheet.addRow([]); // Empty row for spacing
    
    const headerRow = summarySheet.addRow(headers);
    headerRow.font = { 
      name: 'Calibri', 
      size: 11, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF34495E' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Add borders to header
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Data Rows
    summary.forEach((s, index) => {
      const period = formatPeriod(s._id, filter);
      const successRate = s.totalOrders > 0 ? ((s.paidOrders / s.totalOrders) * 100).toFixed(1) : 0;
      
      const dataRow = summarySheet.addRow([
        period,
        s.totalOrders,
        s.paidOrders,
        s.codOrders,
        s.refundedOrders,
        s.totalRevenue.toFixed(2),
        successRate
      ]);

      // Style data rows
      dataRow.font = { name: 'Calibri', size: 10 };
      dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Alternate row colors
      const fillColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };

      // Add borders
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          right: { style: 'thin', color: { argb: 'FFDEE2E6' } }
        };
      });

      // Color-code cells based on values
      dataRow.getCell(3).font = { name: 'Calibri', size: 10, color: { argb: 'FF28A745' } }; // Paid Orders
      dataRow.getCell(4).font = { name: 'Calibri', size: 10, color: { argb: 'FF17A2B8' } }; // COD Orders
      dataRow.getCell(5).font = { name: 'Calibri', size: 10, color: { argb: 'FFDC3545' } }; // Refunded Orders
      dataRow.getCell(6).font = { name: 'Calibri', size: 10, color: { argb: 'FF28A745', bold: true } }; // Revenue
      dataRow.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: 'FF17A2B8' } }; // Success Rate
    });

    // ==============================
    // DETAILED LEDGER WORKSHEET
    // ==============================
    
    const detailSheet = workbook.addWorksheet('Detailed Ledger', {
      pageSetup: { 
        paperSize: 9, // A4
        orientation: 'landscape',
        margins: {
          left: 0.5, right: 0.5,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      }
    });

    // Define columns for detail sheet
    detailSheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 20 },
      { header: 'Product Name', key: 'productName', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 }
    ];

    // Title for detail sheet
    detailSheet.mergeCells('A1:H1');
    const detailTitleCell = detailSheet.getCell('A1');
    detailTitleCell.value = 'DETAILED TRANSACTION LEDGER';
    detailTitleCell.font = { 
      name: 'Calibri', 
      size: 16, 
      bold: true, 
      color: { argb: 'FF2C3E50' } 
    };
    detailTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    detailTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F4FD' }
    };

    // Add empty row
    detailSheet.addRow([]);

    // Style the header row
    const detailHeaderRow = detailSheet.getRow(3);
    detailHeaderRow.values = [
      'Order ID', 'Customer Name', 'Product Name', 'Quantity', 
      'Payment Method', 'Order Status', 'Order Date', 'Total Amount (₹)'
    ];
    
    detailHeaderRow.font = { 
      name: 'Calibri', 
      size: 11, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    detailHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF34495E' }
    };
    detailHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    detailHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add detail data
    details.forEach((detail, index) => {
      const row = detailSheet.addRow({
        orderId: detail.orderId ? `#${detail.orderId.slice(-8)}` : 'N/A',
        customerName: detail.userName || 'Unknown',
        productName: detail.itemName || 'N/A',
        quantity: detail.itemQty || 0,
        paymentMethod: detail.paymentMethod || 'N/A',
        orderStatus: detail.itemStatus || 'N/A',
        orderDate: formatExcelDate(detail.orderDate),
        totalAmount: detail.totalAmount ? detail.totalAmount.toFixed(2) : '0.00'
      });

      // Style data rows
      row.font = { name: 'Calibri', size: 10 };
      row.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Center align quantity and amount
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };

      // Alternate row colors
      const fillColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          left: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          bottom: { style: 'thin', color: { argb: 'FFDEE2E6' } },
          right: { style: 'thin', color: { argb: 'FFDEE2E6' } }
        };
      });

      // Color-code status cells
      const statusCell = row.getCell(6);
      const statusColor = getStatusColor(detail.itemStatus);
      statusCell.font = { 
        name: 'Calibri', 
        size: 10, 
        color: { argb: statusColor.font },
        bold: true
      };
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor.background }
      };

      // Color-code payment method
      const paymentCell = row.getCell(5);
      const paymentColor = getPaymentColor(detail.paymentMethod);
      paymentCell.font = { 
        name: 'Calibri', 
        size: 10, 
        color: { argb: paymentColor }
      };
    });

    // ==============================
    // SET RESPONSE HEADERS & DOWNLOAD
    // ==============================
    
    const fileName = `ledger-${filter}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).json({ 
      error: 'Failed to generate Excel file',
      message: error.message 
    });
  }
};

// ==============================
// HELPER FUNCTIONS
// ==============================

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

function formatExcelDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getStatusColor(status) {
  const statusLower = status?.toLowerCase() || '';
  
  switch (statusLower) {
    case 'delivered':
    case 'completed':
    case 'paid':
      return { 
        font: 'FF1E7E34', 
        background: 'FFD4EDDA' 
      };
    case 'pending':
    case 'processing':
      return { 
        font: 'FF856404', 
        background: 'FFFFEAA7' 
      };
    case 'cancelled':
    case 'refunded':
    case 'failed':
      return { 
        font: 'FF721C24', 
        background: 'FFF8D7DA' 
      };
    default:
      return { 
        font: 'FF495057', 
        background: 'FFF8F9FA' 
      };
  }
}

function getPaymentColor(paymentMethod) {
  const methodLower = paymentMethod?.toLowerCase() || '';
  
  switch (methodLower) {
    case 'paid':
    case 'online':
    case 'card':
      return 'FF28A745';
    case 'cod':
      return 'FF17A2B8';
    case 'pending':
      return 'FFFFC107';
    default:
      return 'FF6C757D';
  }
}

module.exports = { generateLedgerExcel };
