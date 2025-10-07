const ExcelJS = require('exceljs');

const generateSalesReportExcel = async (reportData, filter, res) => {
  const { orders, summary, period } = reportData;

  try {
    // Create workbook and set properties
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Sales Management System';
    workbook.lastModifiedBy = 'System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ==============================
    // EXECUTIVE SUMMARY WORKSHEET
    // ==============================
    
    const summarySheet = workbook.addWorksheet('Executive Summary', {
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

    // Define column widths
    summarySheet.columns = [
      { width: 20 }, // A
      { width: 20 }, // B
      { width: 20 }, // C
      { width: 20 }  // D
    ];

    // Title Row
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'SALES PERFORMANCE REPORT';
    titleCell.font = { 
      name: 'Calibri', 
      size: 26, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    summarySheet.getRow(1).height = 40;

    // Period Information
    summarySheet.mergeCells('A2:D2');
    const periodCell = summarySheet.getCell('A2');
    periodCell.value = `Period: ${filter.toUpperCase()}${period?.current?.start && period?.current?.end ? ` | ${formatDateRange(period.current.start, period.current.end)}` : ''}`;
    periodCell.font = { 
      name: 'Calibri', 
      size: 16, 
      color: { argb: 'FFE0F2FE' }
    };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };
    periodCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    summarySheet.getRow(2).height = 25;

    // Add empty row
    summarySheet.addRow([]);

    // Executive Summary Header
    summarySheet.mergeCells('A4:D4');
    const summaryHeaderCell = summarySheet.getCell('A4');
    summaryHeaderCell.value = 'Executive Summary';
    summaryHeaderCell.font = { 
      name: 'Calibri', 
      size: 20, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    summaryHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    summarySheet.getRow(4).height = 30;

    // Calculate metrics (same as PDF)
    const finalRevenue = summary.totalAmount - summary.totalDiscount;
    const avgOrderValue = summary.totalOrders > 0 ? finalRevenue / summary.totalOrders : 0;
    const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;

    // Metrics cards (matching PDF layout)
    const metricsData = [
      { title: 'Total Orders', value: summary.totalOrders.toLocaleString(), color: 'FF16A34A', bg: 'FFDCFCE7' },
      { title: 'Gross Sales', value: `₹${formatCurrency(summary.totalAmount)}`, color: 'FF2563EB', bg: 'FFDBEAFE' },
      { title: 'Total Discounts', value: `₹${formatCurrency(summary.totalDiscount)}`, color: 'FFDC2626', bg: 'FFFEE2E2' },
      { title: 'Net Revenue', value: `₹${formatCurrency(finalRevenue)}`, color: 'FF059669', bg: 'FFD1FAE5' }
    ];

    let currentRow = 6;
    for (let i = 0; i < metricsData.length; i += 2) {
      // First card (left)
      if (metricsData[i]) {
        summarySheet.mergeCells(`A${currentRow}:B${currentRow + 1}`);
        const card1 = summarySheet.getCell(`A${currentRow}`);
        card1.value = metricsData[i].title;
        card1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: metricsData[i].color } };
        card1.alignment = { horizontal: 'center', vertical: 'middle' };
        card1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricsData[i].bg } };

        summarySheet.mergeCells(`A${currentRow + 2}:B${currentRow + 2}`);
        const value1 = summarySheet.getCell(`A${currentRow + 2}`);
        value1.value = metricsData[i].value;
        value1.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF374151' } };
        value1.alignment = { horizontal: 'center', vertical: 'middle' };
        value1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricsData[i].bg } };

        // Add borders
        for (let r = currentRow; r <= currentRow + 2; r++) {
          for (let c = 1; c <= 2; c++) {
            const cell = summarySheet.getCell(r, c);
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          }
        }
      }

      // Second card (right)
      if (metricsData[i + 1]) {
        summarySheet.mergeCells(`C${currentRow}:D${currentRow + 1}`);
        const card2 = summarySheet.getCell(`C${currentRow}`);
        card2.value = metricsData[i + 1].title;
        card2.font = { name: 'Calibri', size: 14, bold: true, color: { argb: metricsData[i + 1].color } };
        card2.alignment = { horizontal: 'center', vertical: 'middle' };
        card2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricsData[i + 1].bg } };

        summarySheet.mergeCells(`C${currentRow + 2}:D${currentRow + 2}`);
        const value2 = summarySheet.getCell(`C${currentRow + 2}`);
        value2.value = metricsData[i + 1].value;
        value2.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF374151' } };
        value2.alignment = { horizontal: 'center', vertical: 'middle' };
        value2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: metricsData[i + 1].bg } };

        // Add borders
        for (let r = currentRow; r <= currentRow + 2; r++) {
          for (let c = 3; c <= 4; c++) {
            const cell = summarySheet.getCell(r, c);
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
              right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
          }
        }
      }

      currentRow += 5;
    }

    // Growth Indicators section
    currentRow += 2;
    summarySheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const growthHeaderCell = summarySheet.getCell(`A${currentRow}`);
    growthHeaderCell.value = 'Growth Indicators (vs Previous Period)';
    growthHeaderCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF475569' } };
    growthHeaderCell.alignment = { horizontal: 'left', vertical: 'middle' };
    growthHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

    currentRow++;
    const growthRow = summarySheet.addRow([
      `Sales Growth: ${summary.salesGrowth}%`,
      `Orders Growth: ${summary.ordersGrowth}%`,
      `Discount Growth: ${summary.discountGrowth}%`,
      `Avg Order Value: ₹${formatCurrency(avgOrderValue)}`
    ]);

    growthRow.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
    growthRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    growthRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    currentRow++;
    const discountRateRow = summarySheet.addRow([
      `Discount Rate: ${discountRate.toFixed(1)}%`,
      '', '', ''
    ]);
    discountRateRow.font = { name: 'Calibri', size: 11, color: { argb: 'FF1E293B' } };
    discountRateRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    discountRateRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // ==============================
    // ORDER BREAKDOWN WORKSHEET (matching PDF table)
    // ==============================
    
    if (orders && orders.length > 0) {
      const orderSheet = workbook.addWorksheet('Order Breakdown');
      
      orderSheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Total (₹)', key: 'total', width: 15 },
        { header: 'Discount (₹)', key: 'discount', width: 15 },
        { header: 'Final (₹)', key: 'final', width: 15 }
      ];

      // Title
      orderSheet.mergeCells('A1:E1');
      const orderTitleCell = orderSheet.getCell('A1');
      orderTitleCell.value = 'Order Breakdown';
      orderTitleCell.font = { 
        name: 'Calibri', 
        size: 20, 
        bold: true, 
        color: { argb: 'FF1E3A8A' } 
      };
      orderTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
      orderSheet.getRow(1).height = 30;

      // Empty row
      orderSheet.addRow([]);

      // Header row
      const headerRow = orderSheet.addRow(['Order ID', 'Date', 'Total (₹)', 'Discount (₹)', 'Final (₹)']);
      headerRow.font = { 
        name: 'Calibri', 
        size: 11, 
        bold: true, 
        color: { argb: 'FFFFFFFF' } 
      };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF3B82F6' } },
          left: { style: 'thin', color: { argb: 'FF3B82F6' } },
          bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
          right: { style: 'thin', color: { argb: 'FF3B82F6' } }
        };
      });

      // Add order data
      orders.forEach((order, index) => {
        // Ensure order ID shows only last 8 characters (same as PDF)
        const shortOrderId = order.orderId ? order.orderId.toString().slice(-8) : "N/A";
        
        const row = orderSheet.addRow([
          shortOrderId,
          new Date(order.createdOn).toLocaleDateString("en-IN"),
          formatCurrency(order.totalPrice),
          formatCurrency(order.couponDiscount),
          formatCurrency(order.finalAmount)
        ]);

        // Style data rows
        row.font = { name: 'Calibri', size: 10, color: { argb: 'FF1F2937' } };
        
        // Alternate row colors
        const fillColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };

        // Center align date, right align numbers
        row.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }; // Order ID
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }; // Date
        row.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' }; // Total
        row.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }; // Discount
        row.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }; // Final

        // Add borders
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });
    }

    // ==============================
    // PERFORMANCE INSIGHTS WORKSHEET (matching PDF insights)
    // ==============================
    
    const insightsSheet = workbook.addWorksheet('Performance Insights');
    
    insightsSheet.columns = [
      { width: 25 }, // Title
      { width: 60 }  // Description
    ];

    // Title
    insightsSheet.mergeCells('A1:B1');
    const insightsTitleCell = insightsSheet.getCell('A1');
    insightsTitleCell.value = 'Performance Insights';
    insightsTitleCell.font = { 
      name: 'Calibri', 
      size: 20, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    insightsTitleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    insightsSheet.getRow(1).height = 30;

    // Empty row
    insightsSheet.addRow([]);

    // Generate insights (same logic as PDF)
    const insights = calculateInsights(summary);
    
    insights.forEach((insight, index) => {
      // Add insight title and description
      const titleRow = insightsSheet.addRow([insight.title, '']);
      titleRow.font = { 
        name: 'Calibri', 
        size: 14, 
        bold: true, 
        color: { argb: 'FF374151' } 
      };

      const bg = index % 2 === 0 ? 'FFF0F9FF' : 'FFFEFCE8';
      const border = index % 2 === 0 ? 'FF0EA5E9' : 'FFEAB308';

      titleRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bg }
      };

      const descRow = insightsSheet.addRow(['', insight.description]);
      descRow.font = { 
        name: 'Calibri', 
        size: 11, 
        color: { argb: 'FF6B7280' } 
      };
      descRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bg }
      };
      descRow.alignment = { wrapText: true, vertical: 'top' };
      descRow.height = 40;

      // Add borders
      [titleRow, descRow].forEach(row => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: border } },
            left: { style: 'thin', color: { argb: border } },
            bottom: { style: 'thin', color: { argb: border } },
            right: { style: 'thin', color: { argb: border } }
          };
        });
      });

      // Empty row between insights
      insightsSheet.addRow([]);
    });

    // ==============================
    // SET RESPONSE HEADERS & DOWNLOAD
    // ==============================
    
    const fileName = `sales-report-${filter}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
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
    console.error('Error generating sales Excel file:', error);
    res.status(500).json({ 
      error: 'Failed to generate sales Excel file',
      message: error.message 
    });
  }
};

// ==============================
// HELPER FUNCTIONS (same as PDF)
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

module.exports = { generateSalesReportExcel };
