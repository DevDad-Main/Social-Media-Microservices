import { AppError, logger } from "devdad-express-utils";
import "dotenv/config";
import nodemailer from "nodemailer";
import path from "path";

//TODO: add .env vars later
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  service: process.env.SMTP_SERVICE,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    logger.error(error.msg || "Sending email failed", { error });
    throw error;
  }
};
