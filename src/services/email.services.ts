import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM as string,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
};