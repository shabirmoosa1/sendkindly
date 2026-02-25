import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (!resend) {
    console.error('RESEND_API_KEY is not configured — skipping email');
    return false;
  }

  try {
    const { error } = await resend.emails.send({
      from: 'SendKindly <notifications@sendkindly.com>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}
