const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const nodemailer = require('nodemailer');
const {generateInvoicePDF}  = require('../../helpers/pdfGenerator');
const path = require('path');
const ejs = require('ejs');
const fs = require('fs');

const getFullInvoice = async (req,res)=>{
  try {
      const userId = req.session.userId || req.session.user?._id;
      const userData = await User.findOne({ _id: userId, isBlocked: false });

      const { orderId } = req.params;
      const order = await Order.findById(orderId).populate('orderitems.product');

      if (!order) return res.status(404).send('Order not found');

      res.render('invoice', { user:userData, order ,invoiceType: 'full'});
    } catch (error) {
      console.error('Error loading full invoice:', error);
      res.status(500).send('Internal Server Error');
    }
}

const getItemInvoice = async (req,res)=>{
    try {
      const userId = req.session.userId || req.session.user?._id;
      const user = await User.findOne({ _id: userId, isBlocked: false });
    
      const { orderId, itemId } = req.params;
      const order = await Order.findById(orderId).populate('orderitems.product');
    
      if (!order) return res.status(404).send('Order not found');
    
      const item = order.orderitems.find(i => i._id.toString() === itemId);
      if (!item) return res.status(404).send('Item not found in order');
    
      res.render('invoice', { user, order, item ,invoiceType: 'item'});
    } catch (error) {
      console.error('Error loading item invoice:', error);
      res.status(500).send('Internal Server Error');
    }
}

const downloadFullInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.userId || req.session.user?._id;

    const order = await Order.findById(orderId)
      .populate('orderitems.product')
      .populate('orderitems.product.category');
    const user = await User.findById(userId);

    if (!order || !user) {
      return res.status(404).json({ error: 'Order or user not found' });
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF(order, user, 'full');

    // Generate filename
    const fileName = `invoice-${order.orderId}-${new Date().toISOString().split('T')[0]}.pdf`;

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.end(pdfBuffer);

  } catch (err) {
    console.error('Full Invoice Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


const downloadItemInvoice = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const userId = req.session.userId || req.session.user?._id;
    console.log(orderId,'hi')
    // Fetch order and user
    const order = await Order.findById(orderId)
      .populate('orderitems.product')
      .populate('orderitems.product.category');
    const user = await User.findById(userId);

    if (!order || !user) {
      return res.status(404).json({ error: 'Order or user not found' });
    }

    // Find the specific item in the order
    const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Order item not found' });
    }

    // Generate PDF for this item only
    const pdfBuffer = await generateInvoicePDF(order, user, 'item', item);

    // Generate filename
    const fileName = `invoice-${order.orderId}-${item.product.productName.replace(/\s+/g, '-')}.pdf`;

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);

  } catch (err) {
    console.error('Item Invoice Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const emailInvoice = async (req, res) => {
  try {
    const { orderId, invoiceType } = req.body;
    const userId = req.session.userId || req.session.user?._id;

    // Only support full order invoices
    if (invoiceType !== 'order') {
      return res.status(400).json({ success: false, message: 'Invalid invoice type' });
    }

    const order = await Order.findById(orderId)
      .populate('orderitems.product')
      .populate('orderitems.product.category');
    const user = await User.findById(userId);

    if (!order || !user) {
      return res.status(404).json({ success: false, message: 'Order or user not found' });
    }

    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(order, user, 'full');

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.NODEMAILER_EMAIL, 
        pass: process.env.NODEMAILER_PASSWORD  
      }
    });

    // Email options
    const mailOptions = {
      from: `"WoodLand" <${process.env.NODEMAILER_EMAIL}>`,
      to: user.email,
      subject: `Invoice for Order #${order.orderId}`,
      text: `Dear ${user.name},\n\nPlease find attached the invoice for your order #${order.orderId}.\n\nThank you for shopping with us!\n\n- WoodLand`,
      attachments: [
        {
          filename: `invoice-${order.orderId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.json({ success: true, message: 'Invoice emailed successfully!' });

  } catch (error) {
    console.error('Email Invoice Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send invoice email' });
  }
};


module.exports = {
    getFullInvoice,
    getItemInvoice,
    downloadFullInvoice,
    downloadItemInvoice,
    emailInvoice
}