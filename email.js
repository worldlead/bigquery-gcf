const functions = require('@google-cloud/functions-framework');

const nodemailer = require('nodemailer');


functions.http('helloHttp', async (req, res) => {
    //Get access token to zistemo API
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      port: 587,
      auth: {
        user: 'elfsulac67@gmail.com',
        pass: 'qgtfzsvyrjvvungg'
      }
    });

    const mailOptions = {
      from: 'elfsulac67@gmail.com',
      to: 'goodhelp1210@gmail.com',
      subject: 'Sending Email using Node.js',
      text: 'That was easy!'
    };

    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        res.status(200).send(error);
      } else {
        res.status(200).send();
      }
    });

});