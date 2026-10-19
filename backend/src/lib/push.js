const prisma = require('./prisma');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

const SEND_BATCH_SIZE = 100;
const RECEIPT_BATCH_SIZE = 300;
const RECEIPT_DELAY_MS = 16 * 60 * 1000;        // Expo asks us to wait at least 15 minutes
const RECEIPT_MAX_AGE_MS = 23 * 60 * 60 * 1000; // Expo keeps receipts for 24 hours
const RECEIPT_MAX_ATTEMPTS = 5;
const RECEIPT_MAX_QUEUE = 5000;
// Drop a push the phone could not receive within 3 days instead of showing a stale reminder.
const PUSH_TTL_SECONDS = 3 * 24 * 60 * 60;

// Tickets waiting for their delivery receipt. In memory on purpose: if the server
// restarts we only lose the optional cleanup of dead tokens, never a notification.
let pendingReceipts = [];
let receiptTimer = null;

function expoHeaders() {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  // Optional: set EXPO_ACCESS_TOKEN if you turn on "enhanced push security" in your Expo account.
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  return headers;
}

async function removeTokens(tokenIds) {
  const ids = [...new Set(tokenIds.filter(Boolean))];
  if (!ids.length) return;
  await prisma.pushToken.deleteMany({ where: { id: { in: ids } } });
}

function scheduleReceiptCheck() {
  if (receiptTimer || !pendingReceipts.length) return;
  receiptTimer = setTimeout(() => {
    receiptTimer = null;
    checkPendingReceipts().catch((error) => console.error('Push receipt check failed:', error.message));
  }, RECEIPT_DELAY_MS);
  if (typeof receiptTimer.unref === 'function') receiptTimer.unref();
}

// A "ok" ticket only means Expo accepted the message. The receipt, available
// ~15 minutes later, says whether Google (FCM) delivered it, and is where
// DeviceNotRegistered and InvalidCredentials (a Firebase key problem) show up.
async function checkPendingReceipts() {
  const now = Date.now();
  const due = pendingReceipts.filter((item) => now - item.sentAt >= RECEIPT_DELAY_MS);
  if (!due.length) return;

  const dueSet = new Set(due);
  pendingReceipts = pendingReceipts.filter((item) => !dueSet.has(item));

  const retry = [];
  const deadTokenIds = [];
  const requeue = (item) => {
    if (now - item.sentAt < RECEIPT_MAX_AGE_MS && item.attempts + 1 < RECEIPT_MAX_ATTEMPTS) {
      retry.push({ ...item, attempts: item.attempts + 1 });
    }
  };

  for (let offset = 0; offset < due.length; offset += RECEIPT_BATCH_SIZE) {
    const batch = due.slice(offset, offset + RECEIPT_BATCH_SIZE);
    try {
      const response = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: expoHeaders(),
        body: JSON.stringify({ ids: batch.map((item) => item.ticketId) }),
      });
      if (!response.ok) throw new Error(`Expo receipts returned HTTP ${response.status}`);
      const body = await response.json();
      const receipts = body && typeof body.data === 'object' && body.data ? body.data : {};

      for (const item of batch) {
        const receipt = receipts[item.ticketId];
        if (!receipt) {
          requeue(item); // not ready yet
        } else if (receipt.status === 'error') {
          const code = receipt.details && receipt.details.error;
          if (code === 'DeviceNotRegistered') {
            deadTokenIds.push(item.tokenId);
          } else {
            // InvalidCredentials / MismatchSenderId = fix the FCM key uploaded to EAS.
            console.error(`Push delivery error (${code || 'unknown'}): ${receipt.message || ''}`);
          }
        }
      }
    } catch (error) {
      console.error('Push receipt batch failed:', error.message);
      batch.forEach(requeue);
    }
  }

  if (deadTokenIds.length) await removeTokens(deadTokenIds);
  pendingReceipts = pendingReceipts.concat(retry).slice(-RECEIPT_MAX_QUEUE);
  scheduleReceiptCheck();
}

async function sendPushToUsers(userIds, notification) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  // Clear out receipts from earlier sends (also covers a server that was asleep
  // when the timer was due). Never blocks or fails this send.
  checkPendingReceipts().catch((error) => console.error('Push receipt check failed:', error.message));

  try {
    const devices = await prisma.pushToken.findMany({
      where: { userId: { in: uniqueIds } },
      select: { id: true, token: true },
    });
    if (!devices.length) return;

    for (let offset = 0; offset < devices.length; offset += SEND_BATCH_SIZE) {
      const batch = devices.slice(offset, offset + SEND_BATCH_SIZE);
      // One failed batch must not stop the remaining batches.
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: expoHeaders(),
          body: JSON.stringify(batch.map(({ token }) => ({
            to: token,
            title: notification.title,
            body: notification.message,
            sound: 'default',
            channelId: 'default',
            priority: 'high', // wake Android phones in battery saver / Doze
            ttl: PUSH_TTL_SECONDS,
            data: { type: notification.type, relatedId: notification.relatedId || null },
          }))),
        });
        if (!response.ok) throw new Error(`Expo Push Service returned HTTP ${response.status}`);

        const result = await response.json();
        if (!Array.isArray(result.data)) throw new Error('Expo Push Service returned an unexpected response');

        const deadTokenIds = [];
        const sentAt = Date.now();
        result.data.forEach((ticket, index) => {
          const device = batch[index];
          if (!device || !ticket) return;
          if (ticket.status === 'ok' && ticket.id) {
            pendingReceipts.push({ ticketId: ticket.id, tokenId: device.id, sentAt, attempts: 0 });
          } else if (ticket.status === 'error') {
            const code = ticket.details && ticket.details.error;
            if (code === 'DeviceNotRegistered') deadTokenIds.push(device.id);
            else console.error(`Push rejected (${code || 'unknown'}): ${ticket.message || ''}`);
          }
        });

        if (deadTokenIds.length) await removeTokens(deadTokenIds);
        pendingReceipts = pendingReceipts.slice(-RECEIPT_MAX_QUEUE);
        scheduleReceiptCheck();
      } catch (error) {
        console.error('Push notification batch failed:', error.message);
      }
    }
  } catch (error) {
    // Push delivery must not roll back the in-app notification or its related action.
    console.error('Push notification delivery failed:', error.message);
  }
}

module.exports = { sendPushToUsers };
