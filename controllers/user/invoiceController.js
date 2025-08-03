const Order = require('../../model/orderSchema');
const User = require('../../model/userSchema');
const generatePDF = require('../../helpers/pdfGenerator');
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

const downloadFullInvoice = async(req,res)=>{
    try {
    const { orderId } = req.params;
    const userId = req.session.userId || req.session.user?._id;

    const order = await Order.findById(orderId).populate('orderitems.product');
    const user = await User.findById(userId);

    if (!order || !user) return res.status(404).send('Order or user not found');

    const html = await ejs.renderFile(
      path.join(__dirname, '../../views/user/invoice.ejs'),
      { order, user, invoiceType: 'full' }
    );

    const pdfBuffer = await generatePDF(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=invoice-full.pdf',
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Full Invoice Error:', err);
    res.status(500).send('Internal Server Error');
  }
}

const downloadItemInvoice = async(req,res)=>{
    try {
    const { orderId, itemId } = req.params;
    const userId = req.session.userId || req.session.user?._id;

    const order = await Order.findById(orderId).populate('orderitems.product');
    const user = await User.findById(userId);
    const item = order?.orderitems.find(i => i._id.toString() === itemId);

    if (!order || !item || !user) return res.status(404).send('Invalid order/item');

    const html = await ejs.renderFile(
      path.join(__dirname, '../../views/user/invoice.ejs'),
      { order, item, user, invoiceType: 'item' }
    );

    const pdfBuffer = await generatePDF(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=invoice-item.pdf',
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Item Invoice Error:', err);
    res.status(500).send('Internal Server Error');
  }
}



module.exports = {
    getFullInvoice,
    getItemInvoice,
    downloadFullInvoice,
    downloadItemInvoice
}