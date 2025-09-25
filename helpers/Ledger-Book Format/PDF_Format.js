const PDFDocument = require("pdfkit");

const generateLedgerPDF = (ledgerData, filter, res) => {
  const { details, summary } = ledgerData;

  const doc = new PDFDocument({ 
    margin: 50, 
    size: "A4",
    bufferPages: true 
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=ledger-${filter}-${new Date().toISOString().split('T')[0]}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // ==============================
  // HEADER SECTION
  // ==============================
  
  // Company/Title Header
  doc.rect(50, 50, doc.page.width - 100, 80)
     .fillAndStroke("#2c3e50", "#34495e");
  
  doc.fillColor("#ffffff")
     .fontSize(24)
     .font("Helvetica-Bold")
     .text("ORDER LEDGER REPORT", 50, 75, {
       align: "center",
       width: doc.page.width - 100
     });

  doc.fillColor("#ecf0f1")
     .fontSize(14)
     .font("Helvetica")
     .text(`Report Period: ${filter.toUpperCase()}`, 50, 105, {
       align: "center",
       width: doc.page.width - 100
     });

  doc.fillColor("#bdc3c7")
     .fontSize(10)
     .text(`Generated on: ${new Date().toLocaleDateString('en-IN', {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     })}`, 50, 120, {
       align: "center",
       width: doc.page.width - 100
     });

  doc.moveDown(3);

  // ==============================
  // SUMMARY SECTION
  // ==============================
  
  const summaryStartY = 170;
  doc.y = summaryStartY;

  // Summary Title
  doc.fillColor("#2c3e50")
     .fontSize(18)
     .font("Helvetica-Bold")
     .text("Executive Summary", 50, summaryStartY);

  let currentY = summaryStartY + 30;

  summary.forEach((s, index) => {
    const period = formatPeriod(s._id, filter);
    
    // Summary Card Background
    const cardHeight = 140;
    doc.rect(50, currentY, doc.page.width - 100, cardHeight)
       .fillAndStroke("#f8f9fa", "#dee2e6");

    // Period Header
    doc.fillColor("#495057")
       .fontSize(14)
       .font("Helvetica-Bold")
       .text(`Period: ${period}`, 60, currentY + 15);

    // Statistics in two columns
    const leftCol = 70;
    const rightCol = (doc.page.width / 2) + 20;
    let statY = currentY + 40;

    // Left Column
    doc.fillColor("#6c757d")
       .fontSize(11)
       .font("Helvetica");

    doc.text("Total Orders:", leftCol, statY);
    doc.fillColor("#28a745")
       .font("Helvetica-Bold")
       .text(s.totalOrders.toString(), leftCol + 80, statY);

    doc.fillColor("#6c757d")
       .font("Helvetica")
       .text("Paid Orders:", leftCol, statY + 20);
    doc.fillColor("#17a2b8")
       .font("Helvetica-Bold")
       .text(s.paidOrders.toString(), leftCol + 80, statY + 20);

    doc.fillColor("#6c757d")
       .font("Helvetica")
       .text("COD Orders:", leftCol, statY + 40);
    doc.fillColor("#ffc107")
       .font("Helvetica-Bold")
       .text(s.codOrders.toString(), leftCol + 80, statY + 40);

    // Right Column
    doc.fillColor("#6c757d")
       .font("Helvetica")
       .text("Refunded Orders:", rightCol, statY);
    doc.fillColor("#dc3545")
       .font("Helvetica-Bold")
       .text(s.refundedOrders.toString(), rightCol + 100, statY);

    doc.fillColor("#6c757d")
       .font("Helvetica")
       .text("Total Revenue:", rightCol, statY + 20);
    doc.fillColor("#28a745")
       .fontSize(12)
       .font("Helvetica-Bold")
       .text(`₹${formatCurrency(s.totalRevenue)}`, rightCol + 100, statY + 20);

    // Success Rate
    const successRate = s.totalOrders > 0 ? ((s.paidOrders / s.totalOrders) * 100).toFixed(1) : 0;
    doc.fillColor("#6c757d")
       .fontSize(11)
       .font("Helvetica")
       .text("Success Rate:", rightCol, statY + 40);
    doc.fillColor("#17a2b8")
       .font("Helvetica-Bold")
       .text(`${successRate}%`, rightCol + 100, statY + 40);

    currentY += cardHeight + 20;
  });

  // ==============================
  // DETAILED LEDGER TABLE
  // ==============================
  
  doc.addPage();
  
  // Table Title
  doc.fillColor("#2c3e50")
     .fontSize(18)
     .font("Helvetica-Bold")
     .text("Detailed Transaction Ledger", 50, 50);

  const tableTop = 90;
  const colWidths = [80, 85, 110, 40, 75, 70, 85];
  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = (doc.page.width - totalTableWidth) / 2;

  const headers = [
    "Order ID",
    "Customer",
    "Product",
    "Qty",
    "Payment",
    "Status",
    "Order Date"
  ];

  // Table Header
  doc.rect(tableX, tableTop, totalTableWidth, 30)
     .fillAndStroke("#343a40", "#495057");

  headers.forEach((header, i) => {
    const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    doc.fillColor("#ffffff")
       .fontSize(10)
       .font("Helvetica-Bold")
       .text(header, x + 5, tableTop + 10, {
         width: colWidths[i] - 10,
         align: "center"
       });
  });

  // Table Rows
  let rowY = tableTop + 30;
  const rowHeight = 25;

  details.forEach((d, idx) => {
    // Alternate row colors
    const rowColor = idx % 2 === 0 ? "#f8f9fa" : "#ffffff";
    doc.rect(tableX, rowY, totalTableWidth, rowHeight)
       .fillAndStroke(rowColor, "#dee2e6");

    const row = [
      d.orderId ? `#${d.orderId.slice(-6)}` : "N/A",
      truncateText(d.userName || "Unknown", 12),
      truncateText(d.itemName || "N/A", 15),
      d.itemQty?.toString() || "0",
      d.paymentMethod || "N/A",
      d.itemStatus || "N/A",
      formatDate(d.orderDate)
    ];

    row.forEach((text, i) => {
      const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      const textColor = getStatusColor(text, headers[i]);
      
      doc.fillColor(textColor)
         .fontSize(9)
         .font("Helvetica")
         .text(text, x + 5, rowY + 8, {
           width: colWidths[i] - 10,
           align: i === 3 ? "center" : "left" // Center quantity column
         });
    });

    rowY += rowHeight;

    // Page Break
    if (rowY > doc.page.height - 100) {
      doc.addPage();
      rowY = 50;
    }
  });

  // ==============================
  // FOOTER
  // ==============================
  
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer line
    doc.rect(50, doc.page.height - 60, doc.page.width - 100, 1)
       .fill("#dee2e6");
    
    // Footer text
    doc.fillColor("#6c757d")
       .fontSize(9)
       .font("Helvetica")
       .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 45, {
         align: "center",
         width: doc.page.width - 100
       });
    
    doc.text("Generated by Order Management System", 50, doc.page.height - 30, {
      align: "center",
      width: doc.page.width - 100
    });
  }

  doc.end();
};

// Helper Functions
function formatPeriod(dateObj, filter) {
  switch (filter) {
    case "daily":
      return `${String(dateObj.day).padStart(2, '0')}-${String(dateObj.month).padStart(2, '0')}-${dateObj.year}`;
    case "monthly":
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${monthNames[dateObj.month - 1]} ${dateObj.year}`;
    case "yearly":
      return `${dateObj.year}`;
    default:
      return "Unknown Period";
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

function formatCurrency(amount) {
  if (typeof amount !== 'number') return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function truncateText(text, maxLength) {
  if (!text) return "N/A";
  return text.length > maxLength ? text.substring(0, maxLength - 3) + "..." : text;
}

function getStatusColor(text, header) {
  if (header === "Status") {
    switch (text?.toLowerCase()) {
      case "delivered":
      case "completed":
      case "paid":
        return "#28a745";
      case "pending":
      case "processing":
        return "#ffc107";
      case "cancelled":
      case "refunded":
      case "failed":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }
  
  if (header === "Payment") {
    switch (text?.toLowerCase()) {
      case "paid":
      case "online":
        return "#28a745";
      case "cod":
        return "#17a2b8";
      case "pending":
        return "#ffc107";
      default:
        return "#6c757d";
    }
  }
  
  return "#495057";
}

module.exports = { generateLedgerPDF };
