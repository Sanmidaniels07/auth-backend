import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const isProduction = process.env.NODE_ENV === "production";

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  if (!isProduction) {
    console.log(
      `\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n${html}\n`
    );
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject,
    html,
  });

  if (error) {
    // Resend's sandbox only delivers to the account's own verified address
    // until a custom domain is verified, so locally this will always
    // "fail" for other recipients - the content is already logged above,
    // so don't block the request over it outside production.
    if (!isProduction) {
      console.warn(
        `Email not actually delivered in dev: ${error.message}`
      );
      return null;
    }

    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};