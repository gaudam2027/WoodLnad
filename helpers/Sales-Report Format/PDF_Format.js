const PDFDocument = require("pdfkit");

const generateSalesReportPDF = (reportData, filter, res) => {
  const { timeSeries, summary, dateRange } = reportData;

  const doc = new PDFDocument({ 
    margin: 50, 
    size: "A4",
    bufferPages: true 
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=sales-report-${filter}-${new Date().toISOString().split('T')[0]}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  // ==============================
  // HEADER SECTION
  // ==============================
  
  // Company/Title Header
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

  if (dateRange.startDate && dateRange.endDate) {
    doc.fillColor("#bfdbfe")
       .fontSize(12)
       .text(`${formatDateRange(dateRange.startDate, dateRange.endDate)}`, 50, 125, {
         align: "center",
         width: doc.page.width - 100
       });
  }

  doc.moveDown(4);

  // ==============================
  // EXECUTIVE SUMMARY CARDS
  // ==============================
  
  const summaryStartY = 180;
  doc.y = summaryStartY;

  // Summary Title
  doc.fillColor("#1e3a8a")
     .fontSize(20)
     .font("Helvetica-Bold")
     .text("Executive Summary", 50, summaryStartY);

  // Summary Cards Layout (2x2 grid)
  const cardWidth = (doc.page.width - 120) / 2;
  const cardHeight = 80;
  const cardSpacing = 20;

  const cards = [
    {
      title: "Total Orders",
      value: summary.totalOrders.toLocaleString(),
      color: "#16a34a",
      bgColor: "#dcfce7",
      icon: "📦"
    },
    {
      title: "Gross Sales",
      value: `₹${formatCurrency(summary.totalAmount)}`,
      color: "#2563eb", 
      bgColor: "#dbeafe",
      icon: "💰"
    },
    {
      title: "Total Discounts",
      value: `₹${formatCurrency(summary.totalDiscount)}`,
      color: "#dc2626",
      bgColor: "#fee2e2", 
      icon: "🎫"
    },
    {
      title: "Net Revenue",
      value: `₹${formatCurrency(summary.finalRevenue)}`,
      color: "#059669",
      bgColor: "#d1fae5",
      icon: "📈"
    }
  ];

  let cardY = summaryStartY + 40;
  cards.forEach((card, index) => {
    const cardX = 50 + (index % 2) * (cardWidth + cardSpacing);
    if (index === 2) cardY += cardHeight + 15; // Move to second row

    // Card background
    doc.rect(cardX, cardY, cardWidth, cardHeight)
       .fillAndStroke(card.bgColor, "#e5e7eb");

    // Card content
    doc.fillColor(card.color)
       .fontSize(14)
       .font("Helvetica-Bold")
       .text(card.title, cardX + 15, cardY + 15);

    doc.fillColor("#374151")
       .fontSize(20)
       .font("Helvetica-Bold")
       .text(card.value, cardX + 15, cardY + 40);
  });

  // Additional metrics
  const avgOrderValue = summary.totalOrders > 0 ? summary.finalRevenue / summary.totalOrders : 0;
  const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;

  doc.moveDown(8);
  const metricsY = doc.y;

  doc.rect(50, metricsY, doc.page.width - 100, 60)
     .fillAndStroke("#f8fafc", "#e2e8f0");

  doc.fillColor("#475569")
     .fontSize(12)
     .font("Helvetica")
     .text("Key Performance Indicators", 60, metricsY + 10);

  doc.fillColor("#1e293b")
     .fontSize(11)
     .font("Helvetica")
     .text(`Average Order Value: ₹${formatCurrency(avgOrderValue)}`, 60, metricsY + 30);

  doc.text(`Discount Rate: ${discountRate.toFixed(1)}%`, 300, metricsY + 30);

  // ==============================
  // TIME SERIES DATA TABLE
  // ==============================
  
  doc.addPage();
  
  // Table Title
  doc.fillColor("#1e3a8a")
     .fontSize(20)
     .font("Helvetica-Bold")
     .text("Performance Timeline", 50, 50);

  const tableTop = 90;
  const colWidths = [100, 80, 100, 100, 100, 100];
  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = (doc.page.width - totalTableWidth) / 2;

  const headers = [
    "Period",
    "Orders",
    "Gross Sales (₹)",
    "Discounts (₹)", 
    "Net Revenue (₹)",
    "Avg Order (₹)"
  ];

  // Table Header
  doc.rect(tableX, tableTop, totalTableWidth, 35)
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

  // Table Rows
  let rowY = tableTop + 35;
  const rowHeight = 30;

  timeSeries.forEach((item, idx) => {
    // Alternate row colors
    const rowColor = idx % 2 === 0 ? "#f8fafc" : "#ffffff";
    doc.rect(tableX, rowY, totalTableWidth, rowHeight)
       .fillAndStroke(rowColor, "#e2e8f0");

    const row = [
      item.period,
      item.orders.toLocaleString(),
      formatCurrency(item.sales),
      formatCurrency(item.discounts),
      formatCurrency(item.revenue),
      formatCurrency(item.avgOrder)
    ];

    row.forEach((text, i) => {
      const x = tableX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      const textColor = i === 0 ? "#374151" : "#1f2937";
      const textAlign = i === 0 ? "left" : "right";
      
      doc.fillColor(textColor)
         .fontSize(10)
         .font("Helvetica")
         .text(text, x + 5, rowY + 10, {
           width: colWidths[i] - 10,
           align: textAlign
         });
    });

    rowY += rowHeight;

    // Page Break
    if (rowY > doc.page.height - 120) {
      doc.addPage();
      rowY = 50;
    }
  });

  // ==============================
  // PERFORMANCE INSIGHTS
  // ==============================
  
  doc.addPage();
  
  doc.fillColor("#1e3a8a")
     .fontSize(20)
     .font("Helvetica-Bold")
     .text("Performance Insights", 50, 50);

  let insightY = 90;

  // Calculate insights
  const insights = calculateInsights(timeSeries, summary);

  insights.forEach((insight, index) => {
    // Insight card
    const cardBg = index % 2 === 0 ? "#f0f9ff" : "#fefce8";
    const cardBorder = index % 2 === 0 ? "#0ea5e9" : "#eab308";

    doc.rect(50, insightY, doc.page.width - 100, 70)
       .fillAndStroke(cardBg, cardBorder);

    doc.fillColor("#374151")
       .fontSize(14)
       .font("Helvetica-Bold")
       .text(insight.title, 60, insightY + 15);

    doc.fillColor("#6b7280")
       .fontSize(11)
       .font("Helvetica")
       .text(insight.description, 60, insightY + 35, {
         width: doc.page.width - 120,
         align: "left"
       });

    insightY += 90;
  });

  // ==============================
  // FOOTER
  // ==============================
  
  const pages = doc.bufferedPageRange();
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i);
    
    // Footer line
    doc.rect(50, doc.page.height - 70, doc.page.width - 100, 1)
       .fill("#e5e7eb");
    
    // Footer text
    doc.fillColor("#6b7280")
       .fontSize(9)
       .font("Helvetica")
       .text(`Sales Report | Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 55, {
         align: "center",
         width: doc.page.width - 100
       });
    
    doc.text(`Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, 
             50, doc.page.height - 40, {
      align: "center",
      width: doc.page.width - 100
    });
  }

  doc.end();
};

// ==============================
// HELPER FUNCTIONS
// ==============================

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateRange(startDate, endDate) {
  const start = new Date(startDate).toLocaleDateString('en-IN');
  const end = new Date(endDate).toLocaleDateString('en-IN');
  return `${start} to ${end}`;
}

function calculateInsights(timeSeries, summary) {
  const insights = [];

  if (timeSeries.length === 0) return insights;

  // Growth trend
  if (timeSeries.length > 1) {
    const latest = timeSeries[timeSeries.length - 1];
    const previous = timeSeries[timeSeries.length - 2];
    const growthRate = previous.revenue > 0 
      ? ((latest.revenue - previous.revenue) / previous.revenue * 100)
      : 0;
    
    insights.push({
      title: `Revenue Growth: ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
      description: `Compared to the previous period, revenue has ${growthRate >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(1)}%. ${growthRate >= 5 ? 'Excellent growth momentum!' : growthRate < -5 ? 'Consider reviewing strategy.' : 'Steady performance.'}`
    });
  }

  // Best performing period
  const bestPeriod = timeSeries.reduce((max, item) => 
    item.revenue > max.revenue ? item : max, timeSeries[0]);
  
  insights.push({
    title: `Peak Performance: ${bestPeriod.period}`,
    description: `Highest revenue of ₹${formatCurrency(bestPeriod.revenue)} achieved with ${bestPeriod.orders} orders. Average order value was ₹${formatCurrency(bestPeriod.avgOrder)}.`
  });

  // Average order value insight
  const avgOrderValue = summary.totalOrders > 0 ? summary.finalRevenue / summary.totalOrders : 0;
  insights.push({
    title: `Average Order Value: ₹${formatCurrency(avgOrderValue)}`,
    description: `Customers spend an average of ₹${formatCurrency(avgOrderValue)} per order. ${avgOrderValue > 1000 ? 'Strong customer value!' : avgOrderValue > 500 ? 'Good purchasing power.' : 'Opportunity to increase order value.'}`
  });

  // Discount efficiency
  const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;
  insights.push({
    title: `Discount Impact: ${discountRate.toFixed(1)}%`,
    description: `Discounts account for ${discountRate.toFixed(1)}% of gross sales. ${discountRate > 20 ? 'High discount rate - review pricing strategy.' : discountRate > 10 ? 'Moderate discount usage.' : 'Conservative discount approach.'}`
  });

  return insights;
}

module.exports = { generateSalesReportPDF };
