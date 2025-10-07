const PDFDocument = require("pdfkit");

const generateSalesReportPDF = (reportData, filter, res) => {
  const { orders, summary, period } = reportData;

  // Remove bufferPages to prevent blank page issues
  const doc = new PDFDocument({
    margin: 50,
    size: "A4"
    // Removed bufferPages: true
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=sales-report-${filter}-${new Date().toISOString().split('T')[0]}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // ==============================
  // HEADER
  // ==============================
  doc.rect(50, 50, doc.page.width - 100, 90)
     .fillAndStroke("#1e3a8a", "#3b82f6");

  doc.fillColor("#ffffff")
     .fontSize(26)
     .font("Helvetica-Bold")
     .text("SALES PERFORMANCE REPORT", 50, 75, {
       align: "center",
       width: doc.page.width - 100
     });

  doc.fillColor("#e0f2fe")
     .fontSize(16)
     .font("Helvetica")
     .text(`Period: ${filter.toUpperCase()}`, 50, 105, {
       align: "center",
       width: doc.page.width - 100
     });

  if (period?.current?.start && period?.current?.end) {
    doc.fillColor("#bfdbfe")
       .fontSize(12)
       .text(
         `${formatDateRange(period.current.start, period.current.end)}`,
         50, 125, { align: "center", width: doc.page.width - 100 }
       );
  }

  // ==============================
  // EXECUTIVE SUMMARY
  // ==============================
  const summaryStartY = 180;

  doc.fillColor("#1e3a8a")
     .fontSize(20)
     .font("Helvetica-Bold")
     .text("Executive Summary", 50, summaryStartY);

  const cardWidth = (doc.page.width - 120) / 2;
  const cardHeight = 80;
  const cardSpacing = 20;

  const finalRevenue = summary.totalAmount - summary.totalDiscount;

  const cards = [
    {
      title: "Total Orders",
      value: summary.totalOrders.toLocaleString(),
      color: "#16a34a",
      bgColor: "#dcfce7"
    },
    {
      title: "Gross Sales",
      value: `Rs.${formatCurrency(summary.totalAmount)}`,
      color: "#2563eb",
      bgColor: "#dbeafe"
    },
    {
      title: "Total Discounts",
      value: `Rs.${formatCurrency(summary.totalDiscount)}`,
      color: "#dc2626",
      bgColor: "#fee2e2"
    },
    {
      title: "Net Revenue",
      value: `Rs.${formatCurrency(finalRevenue)}`,
      color: "#059669",
      bgColor: "#d1fae5"
    }
  ];

  let cardY = summaryStartY + 40;
  cards.forEach((card, index) => {
    const cardX = 50 + (index % 2) * (cardWidth + cardSpacing);
    if (index === 2) cardY += cardHeight + 15;

    doc.rect(cardX, cardY, cardWidth, cardHeight)
       .fillAndStroke(card.bgColor, "#e5e7eb");

    doc.fillColor(card.color)
       .fontSize(14)
       .font("Helvetica-Bold")
       .text(card.title, cardX + 15, cardY + 15);

    doc.fillColor("#374151")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text(card.value, cardX + 15, cardY + 40);
  });

  // Growth metrics
  const metricsY = cardY + cardHeight + 20;

  doc.rect(50, metricsY, doc.page.width - 100, 80)
     .fillAndStroke("#f8fafc", "#e2e8f0");

  doc.fillColor("#475569")
     .fontSize(12)
     .font("Helvetica-Bold")
     .text("Growth Indicators (vs Previous Period)", 60, metricsY + 10);

  doc.fillColor("#1e293b")
     .fontSize(11)
     .text(`Sales Growth: ${summary.salesGrowth}%`, 60, metricsY + 35)
     .text(`Orders Growth: ${summary.ordersGrowth}%`, 220, metricsY + 35)
     .text(`Discount Growth: ${summary.discountGrowth}%`, 380, metricsY + 35);

  const avgOrderValue = summary.totalOrders > 0 ? finalRevenue / summary.totalOrders : 0;
  const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;

  doc.text(`Average Order Value: ₹${formatCurrency(avgOrderValue)}`, 60, metricsY + 55);
  doc.text(`Discount Rate: ${discountRate.toFixed(1)}%`, 380, metricsY + 55);

  // ==============================
  // DETAILED ORDERS TABLE
  // ==============================
  // Only add new page if we have orders to show
  if (orders && orders.length > 0) {
    doc.addPage();

    doc.fillColor("#1e3a8a")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text("Order Breakdown", 50, 50);

    const tableTop = 90;
    const colWidths = [80, 150, 80, 80, 80];
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    const tableX = (doc.page.width - totalWidth) / 2;

    const headers = ["Order ID", "Date", "Total (₹)", "Discount (₹)", "Final (₹)"];

    // Table header
    doc.rect(tableX, tableTop, totalWidth, 35)
       .fillAndStroke("#1e3a8a", "#3b82f6");

    headers.forEach((header, i) => {
      const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.fillColor("#ffffff")
         .fontSize(11)
         .font("Helvetica-Bold")
         .text(header, x + 5, tableTop + 12, {
           width: colWidths[i] - 10,
           align: "center"
         });
    });

    let rowY = tableTop + 35;
    const rowHeight = 25;
    const maxY = doc.page.height - 100; // Bottom margin

    orders.forEach((order, idx) => {
      // Check if we need a new page
      if (rowY + rowHeight > maxY) {
        doc.addPage();
        rowY = 50;
        
        // Redraw table header on new page
        doc.rect(tableX, rowY, totalWidth, 35)
           .fillAndStroke("#1e3a8a", "#3b82f6");
        
        headers.forEach((header, i) => {
          const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
          doc.fillColor("#ffffff")
             .fontSize(11)
             .font("Helvetica-Bold")
             .text(header, x + 5, rowY + 12, {
               width: colWidths[i] - 10,
               align: "center"
             });
        });
        
        rowY += 35;
      }

      const rowColor = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
      doc.rect(tableX, rowY, totalWidth, rowHeight)
         .fillAndStroke(rowColor, "#e2e8f0");

      // Ensure order ID shows only last 8 characters
      const shortOrderId = order.orderId ? order.orderId.toString().slice(-8) : "N/A";
      
      const row = [
        shortOrderId,
        new Date(order.createdOn).toLocaleDateString("en-IN"),
        formatCurrency(order.totalPrice),
        formatCurrency(order.couponDiscount),
        formatCurrency(order.finalAmount)
      ];

      row.forEach((text, i) => {
        const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        const align = i === 1 ? "center" : "right";
        doc.fillColor("#1f2937")
           .fontSize(10)
           .font("Helvetica")
           .text(text, x + 5, rowY + 8, {
             width: colWidths[i] - 10,
             align
           });
      });

      rowY += rowHeight;
    });
  }

  // ==============================
  // PERFORMANCE INSIGHTS
  // ==============================
  const insights = calculateInsights(summary);
  
  // Only add insights page if we have insights
  if (insights && insights.length > 0) {
    doc.addPage();
    doc.fillColor("#1e3a8a")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text("Performance Insights", 50, 50);

    let insightY = 90;
    const maxInsightY = doc.page.height - 120;

    insights.forEach((insight, index) => {
      // Check if insight will fit on current page
      if (insightY + 70 > maxInsightY) {
        doc.addPage();
        insightY = 50;
      }

      const bg = index % 2 === 0 ? "#f0f9ff" : "#fefce8";
      const border = index % 2 === 0 ? "#0ea5e9" : "#eab308";

      doc.rect(50, insightY, doc.page.width - 100, 70)
         .fillAndStroke(bg, border);

      doc.fillColor("#374151")
         .fontSize(14)
         .font("Helvetica-Bold")
         .text(insight.title, 60, insightY + 15);

      doc.fillColor("#6b7280")
         .fontSize(11)
         .font("Helvetica")
         .text(insight.description, 60, insightY + 35, {
           width: doc.page.width - 120
         });

      insightY += 90;
    });
  }

  // ==============================
  // SIMPLE FOOTER - No buffering needed
  // ==============================
  const addFooter = (pageNum, totalPages) => {
    const footerY = doc.page.height - 50;
    doc.fillColor("#6b7280")
       .fontSize(9)
       .text(
         `Sales Report | Page ${pageNum} | Generated on ${new Date().toLocaleDateString("en-IN")}`,
         50,
         footerY,
         { align: "center", width: doc.page.width - 100 }
       );
  };

  // Add footer to current page (since we can't buffer)
  addFooter(1, "Multiple");

  doc.end();
};

// ==============================
// HELPERS
// ==============================

function formatCurrency(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "0.00";
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate).toLocaleDateString("en-IN");
  const end = new Date(endDate).toLocaleDateString("en-IN");
  return `${start} to ${end}`;
}

function calculateInsights(summary) {
  const insights = [];
  const { salesGrowth, ordersGrowth, discountGrowth, totalAmount, totalDiscount } = summary;

  insights.push({
    title: "Sales Growth",
    description: `Sales changed by ${salesGrowth}% compared to the previous period. ${salesGrowth > 10 ? "Strong upward trend!" : salesGrowth < -10 ? "Revenue dipped noticeably." : "Stable performance."}`
  });

  insights.push({
    title: "Orders Growth", 
    description: `Order volume changed by ${ordersGrowth}% compared to the previous period. ${ordersGrowth > 10 ? "Excellent engagement!" : ordersGrowth < -10 ? "Order rate declined." : "Consistent order flow."}`
  });

  const discountRate = totalAmount > 0 ? (totalDiscount / totalAmount) * 100 : 0;
  insights.push({
    title: "Discount Utilization",
    description: `Discounts account for ${discountRate.toFixed(1)}% of gross sales. ${discountRate > 20 ? "High dependency on discounts - consider optimization." : discountRate < 5 ? "Minimal discount use, strong margins." : "Moderate discounting level."}`
  });

  return insights;
}

module.exports = { generateSalesReportPDF };
