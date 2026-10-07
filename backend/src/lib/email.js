const https = require('https');

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 20000,
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        let parsed;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = { raw: data };
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const detail = parsed?.message || parsed?.name || parsed?.raw || `HTTP ${response.statusCode}`;
        reject(new Error(`Email API error (${response.statusCode}): ${detail}`));
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Email API request timed out.'));
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function resendSend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new Error('Resend email settings are not configured. Set RESEND_API_KEY and RESEND_FROM.');
  }

  const payload = JSON.stringify({
    from,
    to: [to],
    subject,
    text,
    html,
  });

  return postJson(
    'https://api.resend.com/emails',
    { Authorization: `Bearer ${apiKey}` },
    payload
  );
}

async function sendVerificationEmail(email, name, code) {
  const safeName = String(name || 'there')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const subject = 'Your iKonek verification code';
  const text = `Hello ${name},\n\nYour iKonek verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not create an iKonek account, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a"><div style="max-width:520px;margin:auto;background:#fff;padding:28px;border-radius:12px"><h2>iKonek Email Verification</h2><p>Hello ${safeName},</p><p>Use the verification code below to confirm your email address:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:8px">${code}</div><p style="margin-top:20px">This code expires in <strong>10 minutes</strong>.</p><p>If you did not create an iKonek account, you can ignore this email.</p></div></body></html>`;

  await resendSend({ to: email, subject, text, html });
}

module.exports = { sendVerificationEmail };
