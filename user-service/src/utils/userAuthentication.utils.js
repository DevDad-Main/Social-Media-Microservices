import crypto from "crypto";
import { redisClient } from "../lib/redis.lib.js";
import { sendMail } from "./sendMail.utils.js";
import { AppError, logger } from "devdad-express-utils";

//#region Generate OTP Email HTML
const generateOTPEmailHTML = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 20px;
          margin-bottom: 20px;
          color: #333;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
          color: #666;
        }
        .otp-container {
          background: #f8f9fa;
          border: 2px dashed #667eea;
          border-radius: 8px;
          padding: 30px;
          text-align: center;
          margin: 30px 0;
        }
        .otp-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          color: #667eea;
          letter-spacing: 8px;
          margin: 0;
          font-family: 'Courier New', monospace;
        }
        .expiry {
          font-size: 14px;
          color: #999;
          margin-top: 15px;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 30px;
          text-align: center;
          font-size: 14px;
          color: #999;
          border-top: 1px solid #eee;
        }
        .security-tip {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          font-size: 14px;
          color: #856404;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 20px auto;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .otp-code {
            font-size: 28px;
            letter-spacing: 6px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verify Your Email</h1>
        </div>
        <div class="content">
          <p class="greeting">Hi ${name},</p>
          <p class="message">
            Thank you for signing up! To complete your registration and secure your account, 
            please use the verification code below.
          </p>
          
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
            <div class="expiry">This code will expire in 5 minutes</div>
          </div>
          
          <div class="security-tip">
            <strong>🛡️ Security Tip:</strong> Never share this code with anyone. 
            Our team will never ask for your verification code.
          </div>
          
          <p class="message">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Social Media App. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
//#endregion

//#region Helper Functions
const isEmailLocked = async (email) =>
  await redisClient.get(`otp_locked:${email}`);
const isSpamLocked = async (email) =>
  await redisClient.get(`otp_spam_locked:${email}`);
const isOnCooldown = async (email) =>
  await redisClient.get(`otp_cooldown:${email}`);
//#endregion

//#region Check OTP Restrictions
export const checkOTPRestrictions = async (email, next) => {
  logger.info("Checking OTP restrictions for email", { email });
  //NOTE: Potentially lock the email if it fails too many times due to user error

  if (await isEmailLocked(email)) {
    return next(
      new AppError(
        "Account is locked due to multiple failed attempts. Please Try Again After 30 Minutes.",
        400,
      ),
    );
  }
  if (await isSpamLocked(email)) {
    return next(
      new AppError(
        "Too many failed attempts. Please try again after 30 minutes.",
        400,
      ),
    );
  }
  if (await isOnCooldown(email)) {
    return next(
      new AppError(
        "Please wait 1 minute before requesting a new OTP code.",
        400,
      ),
    );
  }
};
//#endregion

//#region Track OTP Requests
export const trackOTPRequests = async (email, next) => {
  const otpRequestKey = `otp_request_count:${email}`;
  let optRequests = parseInt((await redisClient.get(otpRequestKey)) || "0");

  if (optRequests >= 2) {
    await redisClient.set(`otp_spam_locked:${email}`, "locked", "EX", 3600);
    return next(
      new AppError(
        "Too many failed attempts. Please try again after 1 hour.",
        400,
      ),
    );
  }

  await redisClient.set(otpRequestKey, optRequests + 1, "EX", 3600);
};
//#endregion

//#region Send OTP
export const sendOTP = async (name, email) => {
  const otp = crypto.randomInt(1000, 9999).toString();
  logger.info("Sending OTP for email", { email, otp });

  const htmlContent = generateOTPEmailHTML(name, otp);
  await sendMail(email, "Verify Your Email - OTP Code", htmlContent);

  //NOTE: Cache the OTP for 5 minutes
  await redisClient.set(`otp:${email}`, otp, "EX", 300);
  //NOTE: Set cooldown for 1 min between each request
  await redisClient.set(`otp_cooldown:${email}`, "true", "EX", 60);
};
//#endregion
