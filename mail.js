require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  secure: true,
  port: 465,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    throw err;
  }
  console.log('Connected to MySQL database');
});

app.post('/send-email', async (req, res) => {
  const { to, subject, html, text } = req.body;

  if (!text && !html) {
    return res.status(400).send('Either text or html content must be provided');
  }

  try {
    const checkEmailSql = 'SELECT * FROM emails WHERE email = ?';
    db.query(checkEmailSql, [to], async (err, result) => {
      if (err) {
        console.error('Error checking email in database:', err);
        throw err;
      }

      if (result.length === 0) {
        const insertEmailSql = 'INSERT INTO emails (email) VALUES (?)';
        db.query(insertEmailSql, [to], (err, insertResult) => {
          if (err) {
            console.error('Error saving email to database:', err);
            throw err;
          }
          console.log('Email saved to database');
        });
      } else {
        console.log('Email already exists in database');
      }

      const mailOptions = {
        from: process.env.GMAIL_USER,
        to,
        subject,
      };
      if (text) {
        mailOptions.text = text;
      }
      if (html) {
        mailOptions.html = html;
      }

      const info = await transporter.sendMail(mailOptions);

      console.log('Email sent: ' + info.response);
      res.status(200).send('Email sent successfully');
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).send('Failed to send email');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
