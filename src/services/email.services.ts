import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

const transportOptions: SMTPTransport.Options = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

export const transporter = nodemailer.createTransport(transportOptions);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};