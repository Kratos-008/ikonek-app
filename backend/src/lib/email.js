const tls = require('tls');

function readResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';

    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      const complete = lines.filter(Boolean);
      if (!complete.length) return;

      const last = complete[complete.length - 1];
      if (/^\d{3} /.test(last)) {
        socket.removeListener('data', onData);
        resolve(complete.join('\n'));
      }
    };

    socket.on('data', onData);
    socket.once('error', reject);
  });
}

function sendCommand(socket, command, expectedCodes) {
  socket.write(`${command}\r\n`);
  return readResponse(socket).then((response) => {
    const code = Number(response.slice(0, 3));
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP error ${code}: ${response}`);
    }
    return response;
  });
}

function smtpSend({ to, subject, text, html }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !password || !from) {
    throw new Error('SMTP email settings are not configured.');
  }

  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host }, async () => {
      try {
        await readResponse(socket);
        await sendCommand(socket, `EHLO ${host}`, [250]);
        await sendCommand(socket, 'AUTH LOGIN', [334]);
        await sendCommand(socket, Buffer.from(user).toString('base64'), [334]);
        await sendCommand(socket, Buffer.from(password).toString('base64'), [235]);
        await sendCommand(socket, `MAIL FROM:<${from}>`, [250]);
        await sendCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
        await sendCommand(socket, 'DATA', [354]);

        const safeSubject = subject.replace(/[\r\n]/g, ' ');
        const message = [
          `From: iKonek <${from}>`,
          `To: ${to}`,
          `Subject: ${safeSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: multipart/alternative; boundary="iKonekBoundary"',
          '',
          '--iKonekBoundary',
          'Content-Type: text/plain; charset=UTF-8',
          '',
          text,
          '',
          '--iKonekBoundary',
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
          '',
          '--iKonekBoundary--',
          '',
          '.',
        ].join('\r\n');

        socket.write(`${message}\r\n`);
        await readResponse(socket);
        await sendCommand(socket, 'QUIT', [221]);
        socket.end();
        resolve();
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });

    socket.setTimeout(20000, () => {
      socket.destroy(new Error('SMTP connection timed out.'));
    });

    socket.once('error', reject);
  });
}

async function sendVerificationEmail(email, name, code) {
  const subject = 'Your iKonek verification code';
  const text = `Hello ${name},\n\nYour iKonek verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not create an iKonek account, you can ignore this email.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a"><div style="max-width:520px;margin:auto;background:#fff;padding:28px;border-radius:12px"><h2>iKonek Email Verification</h2><p>Hello ${name},</p><p>Use the verification code below to confirm your email address:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:18px;background:#f1f5f9;border-radius:8px">${code}</div><p style="margin-top:20px">This code expires in <strong>10 minutes</strong>.</p><p>If you did not create an iKonek account, you can ignore this email.</p></div></body></html>`;

  await smtpSend({ to: email, subject, text, html });
}

module.exports = { sendVerificationEmail };
