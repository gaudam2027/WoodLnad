const ExcelJS = require('exceljs');

const generateSalesReportExcel = async (reportData, filter, res) => {
  const { timeSeries, summary, dateRange } = reportData;

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
      { width: 25 }, // Metric
      { width: 20 }, // Value
      { width: 15 }, // Performance
      { width: 30 }  // Description
    ];

    // Title Row
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'SALES PERFORMANCE EXECUTIVE SUMMARY';
    titleCell.font = { 
      name: 'Calibri', 
      size: 20, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' }
    };

    // Period Information
    summarySheet.mergeCells('A2:D2');
    const periodCell = summarySheet.getCell('A2');
    periodCell.value = `Report Period: ${filter.toUpperCase()}${dateRange.startDate && dateRange.endDate ? ` | ${formatDateRange(dateRange.startDate, dateRange.endDate)}` : ''} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
    periodCell.font = { 
      name: 'Calibri', 
      size: 12, 
      italic: true,
      color: { argb: 'FF374151' }
    };
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Add empty row
    summarySheet.addRow([]);

    // Key Metrics Header
    const metricsHeaderRow = summarySheet.addRow(['Key Performance Metrics', '', '', '']);
    summarySheet.mergeCells('A4:D4');
    metricsHeaderRow.font = { 
      name: 'Calibri', 
      size: 16, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    metricsHeaderRow.alignment = { horizontal: 'center' };

    // Sub-headers
    const subHeaderRow = summarySheet.addRow(['Metric', 'Value', 'Status', 'Analysis']);
    subHeaderRow.font = { 
      name: 'Calibri', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    subHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    subHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Calculate additional metrics
    const avgOrderValue = summary.totalOrders > 0 ? summary.finalRevenue / summary.totalOrders : 0;
    const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;
    const netMargin = summary.totalAmount > 0 ? ((summary.finalRevenue / summary.totalAmount) * 100) : 0;

    // Metrics data
    const metricsData = [
      {
        metric: 'Total Orders',
        value: summary.totalOrders.toLocaleString(),
        status: getPerformanceStatus(summary.totalOrders, 'orders'),
        analysis: `${summary.totalOrders} orders processed during this period`
      },
      {
        metric: 'Gross Sales Amount',
        value: `₹${formatCurrency(summary.totalAmount)}`,
        status: getPerformanceStatus(summary.totalAmount, 'sales'),
        analysis: `Total sales before discounts and adjustments`
      },
      {
        metric: 'Total Discounts Given',
        value: `₹${formatCurrency(summary.totalDiscount)}`,
        status: getPerformanceStatus(discountRate, 'discount_rate'),
        analysis: `${discountRate.toFixed(1)}% of gross sales as discounts`
      },
      {
        metric: 'Net Revenue',
        value: `₹${formatCurrency(summary.finalRevenue)}`,
        status: getPerformanceStatus(summary.finalRevenue, 'revenue'),
        analysis: `Final revenue after all discounts and adjustments`
      },
      {
        metric: 'Average Order Value',
        value: `₹${formatCurrency(avgOrderValue)}`,
        status: getPerformanceStatus(avgOrderValue, 'aov'),
        analysis: `Revenue per order - key profitability metric`
      },
      {
        metric: 'Net Profit Margin',
        value: `${netMargin.toFixed(1)}%`,
        status: getPerformanceStatus(netMargin, 'margin'),
        analysis: `Percentage of sales retained as net revenue`
      }
    ];

    // Add metrics rows
    metricsData.forEach((metric, index) => {
      const row = summarySheet.addRow([
        metric.metric,
        metric.value,
        metric.status,
        metric.analysis
      ]);

      // Style the row
      row.font = { name: 'Calibri', size: 11 };
      row.alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Alternate row colors
      const fillColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      // Color-code the status cell
      const statusCell = row.getCell(3);
      const statusColor = getStatusColor(metric.status);
      statusCell.font = { 
        name: 'Calibri', 
        size: 11, 
        color: { argb: statusColor.font },
        bold: true
      };
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: statusColor.background }
      };

      // Bold and color the value cell
      const valueCell = row.getCell(2);
      valueCell.font = { 
        name: 'Calibri', 
        size: 11, 
        bold: true,
        color: { argb: 'FF1E3A8A' }
      };
    });

    // ==============================
    // TIME SERIES PERFORMANCE WORKSHEET
    // ==============================
    
    const timeSeriesSheet = workbook.addWorksheet('Time Series Analysis', {
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

    // Define columns for time series
    timeSeriesSheet.columns = [
      { header: 'Period', key: 'period', width: 20 },
      { header: 'Orders', key: 'orders', width: 12 },
      { header: 'Gross Sales (₹)', key: 'grossSales', width: 18 },
      { header: 'Discounts (₹)', key: 'discounts', width: 16 },
      { header: 'Net Revenue (₹)', key: 'netRevenue', width: 18 },
      { header: 'Avg Order Value (₹)', key: 'avgOrder', width: 20 },
      { header: 'Growth Rate (%)', key: 'growthRate', width: 16 },
      { header: 'Performance', key: 'performance', width: 15 }
    ];

    // Title for time series sheet
    timeSeriesSheet.mergeCells('A1:H1');
    const timeSeriesTitleCell = timeSeriesSheet.getCell('A1');
    timeSeriesTitleCell.value = 'SALES PERFORMANCE TIMELINE';
    timeSeriesTitleCell.font = { 
      name: 'Calibri', 
      size: 18, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    timeSeriesTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    timeSeriesTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' }
    };

    // Add empty row
    timeSeriesSheet.addRow([]);

    // Style the header row
    const timeSeriesHeaderRow = timeSeriesSheet.getRow(3);
    timeSeriesHeaderRow.values = [
      'Period', 'Orders', 'Gross Sales (₹)', 'Discounts (₹)', 
      'Net Revenue (₹)', 'Avg Order Value (₹)', 'Growth Rate (%)', 'Performance'
    ];
    
    timeSeriesHeaderRow.font = { 
      name: 'Calibri', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    timeSeriesHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    timeSeriesHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    timeSeriesHeaderRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add time series data
    timeSeries.forEach((item, index) => {
      // Calculate growth rate
      const growthRate = index > 0 && timeSeries[index - 1].revenue > 0
        ? ((item.revenue - timeSeries[index - 1].revenue) / timeSeries[index - 1].revenue * 100)
        : 0;

      const row = timeSeriesSheet.addRow({
        period: item.period,
        orders: item.orders,
        grossSales: item.sales.toFixed(2),
        discounts: item.discounts.toFixed(2),
        netRevenue: item.revenue.toFixed(2),
        avgOrder: item.avgOrder.toFixed(2),
        growthRate: index > 0 ? `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%` : 'N/A',
        performance: getPerformanceRating(item.revenue, timeSeries)
      });

      // Style data rows
      row.font = { name: 'Calibri', size: 10 };
      row.alignment = { horizontal: 'center', vertical: 'middle' };
      
      // Right align numbers
      [3, 4, 5, 6].forEach(colNum => {
        row.getCell(colNum).alignment = { horizontal: 'right', vertical: 'middle' };
      });

      // Alternate row colors
      const fillColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });

      // Color-code growth rate
      const growthCell = row.getCell(7);
      if (index > 0) {
        const growthColor = growthRate >= 5 ? 'FF16A34A' : growthRate >= 0 ? 'FF059669' : 'FFDC2626';
        growthCell.font = { 
          name: 'Calibri', 
          size: 10, 
          color: { argb: growthColor },
          bold: true
        };
      }

      // Color-code performance
      const performanceCell = row.getCell(8);
      const perfColor = getPerformanceColor(row.getCell(8).value);
      performanceCell.font = { 
        name: 'Calibri', 
        size: 10, 
        color: { argb: perfColor.font },
        bold: true
      };
      performanceCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: perfColor.background }
      };
    });

    // ==============================
    // INSIGHTS & RECOMMENDATIONS WORKSHEET
    // ==============================
    
    const insightsSheet = workbook.addWorksheet('Insights & Recommendations');
    
    insightsSheet.columns = [
      { width: 25 }, // Category
      { width: 50 }, // Insight
      { width: 25 }  // Action
    ];

    // Title
    insightsSheet.mergeCells('A1:C1');
    const insightsTitleCell = insightsSheet.getCell('A1');
    insightsTitleCell.value = 'BUSINESS INSIGHTS & RECOMMENDATIONS';
    insightsTitleCell.font = { 
      name: 'Calibri', 
      size: 18, 
      bold: true, 
      color: { argb: 'FF1E3A8A' } 
    };
    insightsTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    insightsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0F2FE' }
    };

    // Generate insights
    const insights = generateBusinessInsights(timeSeries, summary);
    
    // Headers
    const insightsHeaderRow = insightsSheet.addRow(['Category', 'Insight', 'Recommended Action']);
    insightsHeaderRow.font = { 
      name: 'Calibri', 
      size: 12, 
      bold: true, 
      color: { argb: 'FFFFFFFF' } 
    };
    insightsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };

    // Add insights
    insights.forEach((insight, index) => {
      const row = insightsSheet.addRow([
        insight.category,
        insight.insight,
        insight.action
      ]);

      // Style
      row.font = { name: 'Calibri', size: 11 };
      row.alignment = { horizontal: 'left', vertical: 'top' };
      row.height = 40; // Increase row height for better readability

      // Alternate colors
      const fillColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };

      // Wrap text
      row.eachCell((cell) => {
        cell.alignment = { ...cell.alignment, wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
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

function getPerformanceStatus(value, type) {
  switch (type) {
    case 'orders':
      if (value >= 100) return 'Excellent';
      if (value >= 50) return 'Good';
      if (value >= 20) return 'Average';
      return 'Below Average';
    case 'sales':
    case 'revenue':
      if (value >= 100000) return 'Excellent';
      if (value >= 50000) return 'Good';
      if (value >= 20000) return 'Average';
      return 'Below Average';
    case 'aov':
      if (value >= 2000) return 'Excellent';
      if (value >= 1000) return 'Good';
      if (value >= 500) return 'Average';
      return 'Below Average';
    case 'discount_rate':
      if (value <= 5) return 'Excellent';
      if (value <= 10) return 'Good';
      if (value <= 20) return 'Average';
      return 'High';
    case 'margin':
      if (value >= 80) return 'Excellent';
      if (value >= 70) return 'Good';
      if (value >= 60) return 'Average';
      return 'Below Average';
    default:
      return 'N/A';
  }
}

function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'excellent':
      return { font: 'FF16A34A', background: 'FFD1FAE5' };
    case 'good':
      return { font: 'FF059669', background: 'FFECFDF5' };
    case 'average':
      return { font: 'FFCA8A04', background: 'FFFEF3C7' };
    case 'below average':
    case 'high':
      return { font: 'FFDC2626', background: 'FFFECACA' };
    default:
      return { font: 'FF6B7280', background: 'FFF9FAFB' };
  }
}

function getPerformanceRating(revenue, allData) {
  if (allData.length === 0) return 'N/A';
  
  const maxRevenue = Math.max(...allData.map(item => item.revenue));
  const avgRevenue = allData.reduce((sum, item) => sum + item.revenue, 0) / allData.length;
  
  if (revenue >= maxRevenue * 0.9) return 'Excellent';
  if (revenue >= avgRevenue * 1.1) return 'Above Average';
  if (revenue >= avgRevenue * 0.9) return 'Average';
  return 'Below Average';
}

function getPerformanceColor(performance) {
  switch (performance?.toLowerCase()) {
    case 'excellent':
      return { font: 'FF16A34A', background: 'FFD1FAE5' };
    case 'above average':
      return { font: 'FF059669', background: 'FFECFDF5' };
    case 'average':
      return { font: 'FFCA8A04', background: 'FFFEF3C7' };
    case 'below average':
      return { font: 'FFDC2626', background: 'FFFECACA' };
    default:
      return { font: 'FF6B7280', background: 'FFF9FAFB' };
  }
}

function generateBusinessInsights(timeSeries, summary) {
  const insights = [];

  if (timeSeries.length === 0) return insights;

  // Revenue trend analysis
  if (timeSeries.length > 1) {
    const latest = timeSeries[timeSeries.length - 1];
    const previous = timeSeries[timeSeries.length - 2];
    const growthRate = previous.revenue > 0 
      ? ((latest.revenue - previous.revenue) / previous.revenue * 100)
      : 0;
    
    insights.push({
      category: 'Revenue Growth',
      insight: `Revenue ${growthRate >= 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(1)}% compared to the previous period.`,
      action: growthRate >= 5 ? 'Maintain current strategies' : growthRate < -5 ? 'Review marketing and pricing strategies' : 'Monitor trends closely'
    });
  }

  // Best performing period
  const bestPeriod = timeSeries.reduce((max, item) => 
    item.revenue > max.revenue ? item : max, timeSeries[0]);
  
  insights.push({
    category: 'Peak Performance',
    insight: `Best performing period: ${bestPeriod.period} with ₹${formatCurrency(bestPeriod.revenue)} revenue from ${bestPeriod.orders} orders.`,
    action: 'Analyze factors that contributed to this peak performance and replicate successful strategies'
  });

  // Average order value analysis
  const avgOrderValue = summary.totalOrders > 0 ? summary.finalRevenue / summary.totalOrders : 0;
  insights.push({
    category: 'Order Value',
    insight: `Average order value is ₹${formatCurrency(avgOrderValue)}. ${avgOrderValue > 1500 ? 'Strong customer purchasing power.' : 'Opportunity to increase order value.'}`,
    action: avgOrderValue > 1500 ? 'Focus on customer retention' : 'Implement upselling and cross-selling strategies'
  });

  // Discount analysis
  const discountRate = summary.totalAmount > 0 ? (summary.totalDiscount / summary.totalAmount) * 100 : 0;
  insights.push({
    category: 'Discount Strategy',
    insight: `Discount rate is ${discountRate.toFixed(1)}% of gross sales. ${discountRate > 15 ? 'High discount usage may impact margins.' : 'Conservative discount approach.'}`,
    action: discountRate > 15 ? 'Review discount policies and focus on value-based pricing' : 'Consider strategic promotions to boost sales'
  });

  return insights;
}

module.exports = { generateSalesReportExcel };
