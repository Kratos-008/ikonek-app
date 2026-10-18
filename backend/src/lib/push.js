const prisma = require('./prisma');

async function sendPushToUsers(userIds, notification) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  try {
    const devices = await prisma.pushToken.findMany({
      where: { userId: { in: uniqueIds } },
      select: { id: true, token: true },
    });
    if (!devices.length) return;

    for (let offset = 0; offset < devices.length; offset += 100) {
      const batch = devices.slice(offset, offset + 100);
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch.map(({ token }) => ({
          to: token,
          title: notification.title,
          body: notification.message,
          sound: 'default',
          channelId: 'default',
          data: { type: notification.type, relatedId: notification.relatedId || null },
        }))),
      });
      if (!response.ok) throw new Error(`Expo Push Service returned HTTP ${response.status}`);
      const result = await response.json();
      const invalidTokens = (result.data || [])
        .map((ticket, index) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
          ? batch[index].id
          : null)
        .filter(Boolean);
      if (invalidTokens.length) await prisma.pushToken.deleteMany({ where: { id: { in: invalidTokens } } });
    }
  } catch (error) {
    // Push delivery must not roll back the in-app notification or its related action.
    console.error('Push notification delivery failed:', error.message);
  }
}

module.exports = { sendPushToUsers };
