const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const caPath = path.join(__dirname, '.local', 'avast-webmail-root.pem');
const caCert = fs.readFileSync(caPath, 'utf8');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'mihirpataliya11@gmail.com', pass: 'whyl xcep raai phyo' },
  ca: caCert,
  tls: { ca: caCert, servername: 'smtp.gmail.com' }
});

transporter.sendMail({
  from: 'mihirpataliya11@gmail.com',
  to: 'mihirpataliya11@gmail.com',
  subject: 'Test SMTP Fix',
  text: 'This is a test email from TuitionPro to verify the SMTP fix works.',
  html: '<p>This is a test email from TuitionPro to verify the SMTP fix works.</p>'
}).then(info => {
  console.log('Message sent:', info.messageId);
}).catch(err => {
  console.error('Send failed:', err.message);
  console.error('Code:', err.code);
  console.error('Response:', err.response);
});