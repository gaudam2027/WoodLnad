const User = require('../../model/userSchema')
const Contact = require('../../model/contactSchema')
const validateContactForm = require('../../helpers/validators/contactValidator')
const nodemailer = require('nodemailer')

const aboutUs = async (req,res) => {
    try {
        const user = req.userData || null;
        res.render('about', { title: 'About Us',user });
    } catch (error) {
        console.error('Error rendering About Us page:', error);
        res.status(500).render('error', { message: 'Failed to load About Us page' });
    }
}

const contactUs = async (req,res) => {
    try {
        const user = req.userData || null;
        res.render('contact', { title: 'Contact Us',user })
    } catch (error) {
        console.error('Error rendering Contact Us page:', error);
        res.status(500).render('error', { message: 'Failed to load Contact Us page' });
    }
}

const postContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message, newsletter } = req.body;

    // validate conatct info
    const { isValid, errors } = validateContactForm({firstName, lastName, email, phone, subject, message});

    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    // Save to MongoDB
    const contact = await Contact.create({
      firstName,
      lastName,
      email,
      phone,
      subject,
      message,
      newsletter: newsletter === 'on' ? true : false
    });

    // Send email to admin
    const transporter = nodemailer.createTransport({
      service: 'Gmail', 
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const mailOptions = {
      from: email, 
      to: process.env.NODEMAILER_EMAIL,
      subject: `New Contact Us Message: ${subject}`,
      html: `
        <h2>New Contact Us Message</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
        <p><strong>Subscribed to Newsletter:</strong> ${newsletter === 'on' ? 'Yes' : 'No'}</p>
      `,
    };

    transporter.sendMail(mailOptions).catch(err => console.error('Email error:', err))

    res.status(200).json({success:true})

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ success: false,message: 'Failed to send your message. Please try again later.'});
  }
};


module.exports = {
    aboutUs,
    contactUs,
    postContactForm
}