const Order = require('../../model/orderSchema');
const moment = require('moment');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const {generateReportData} = require('../../helpers/generateReportData')
const {generateSalesReportPDF} = require('../../helpers/Sales-Report Format/PDF_Format')
const {generateSalesReportExcel} = require('../../helpers/Sales-Report Format/Excel_Format')

// Load Sales Report Page
const loadSalesReport = async (req, res) => {
  try {
    res.render('salesReporter');
  } catch (error) {
    console.error('Sales Report load error:', error);
    res.status(500).send('Server Error');
  }
};

// Generate Sales Report Data with Time Series
const generateSalesReport = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;
    const reportRes = await generateReportData(filter, startDate, endDate);
    

    let chartData = {summary: reportRes.summary}
    // Format chart data: labels + values
    chartData.labels = reportRes.timeSeries.map(item => ({
      label: item.period,      // date / week / month / year
      orders: item.orders,
      sales: item.sales,
      discounts: item.discounts,
      revenue: item.revenue,
      avgOrder: item.avgOrder
    }));



    res.json({
      success: true,
      data: {
        chartData,
        filter,
        dateRange: reportRes.dateRange
      }
    });

  } catch (error) {
    console.error('Generate sales report error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




const exportSalesReport = async(req,res) => {
  try {
    const { filter = "yearly", format = "pdf", startDate, endDate } = req.query;

    console.log("Export request:", { filter, format, startDate, endDate });

    const reportRes = await generateReportData(filter, startDate || null, endDate || null);

    switch (format.toLowerCase()) {
      case "pdf":
        return generateSalesReportPDF(reportRes, filter, res);
      case "excel":
        return generateSalesReportExcel(reportRes, filter, res);
      default:
        return res.status(400).json({ error: "Invalid format requested" });
    }

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).send('Error generating Excel report');
  }
}


module.exports = {
  loadSalesReport,
  generateSalesReport,
  exportSalesReport
};
