const prisma = require("./prisma");

// Church-wide notifications are saved as one row per user at the moment they are
// sent, so anyone who signs up or links their account later would start with an
// empty Notifications screen. This copies the recent church-wide ones (announcements
// and event notices) into that user's list the first time they open it.
// It is silent: no push is sent for these catch-up rows.

const BROADCAST_TYPES = ["ANNOUNCEMENT", "EVENT_CREATED", "EVENT_UPDATED"];
const BROADCAST_ROLES = ["YOUTH", "LEADER"]; // the same roles that receive them when sent
const WINDOW_DAYS = 30;                       // how far back a new user can see
const MAX_BROADCASTS = 30;                    // cap on how many are copied
const MIN_INTERVAL_MS = 2 * 60 * 1000;        // do not re-check the same user more often than this

const inFlight = new Map();
const lastRun = new Map();

const keyOf = (n) => JSON.stringify([n.type, n.title, n.message, n.relatedId || null]);

async function copyMissingBroadcasts(userId) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Distinct church-wide notifications from the last 30 days, newest first.
  const groups = await prisma.notification.groupBy({
    by: ["type", "title", "message", "relatedId"],
    where: { type: { in: BROADCAST_TYPES }, createdAt: { gte: since } },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
    take: MAX_BROADCASTS,
  });
  if (!groups.length) return 0;

  // Event notices only make sense while the event still exists and has not long passed.
  const eventIds = [
    ...new Set(
      groups.filter((g) => g.type.startsWith("EVENT_") && g.relatedId).map((g) => g.relatedId)
    ),
  ];
  const liveEvents = eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: eventIds }, date: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        select: { id: true },
      })
    : [];
  const liveEventIds = new Set(liveEvents.map((e) => e.id));
  const candidates = groups.filter(
    (g) => !g.type.startsWith("EVENT_") || (g.relatedId && liveEventIds.has(g.relatedId))
  );
  if (!candidates.length) return 0;

  // Skip what this user already has (so nothing is duplicated or marked unread again).
  const mine = await prisma.notification.findMany({
    where: { userId, type: { in: BROADCAST_TYPES }, createdAt: { gte: since } },
    select: { type: true, title: true, message: true, relatedId: true },
  });
  const have = new Set(mine.map(keyOf));
  const missing = candidates.filter((g) => !have.has(keyOf(g)));
  if (!missing.length) return 0;

  await prisma.notification.createMany({
    data: missing.map((g) => ({
      userId,
      type: g.type,
      title: g.title,
      message: g.message,
      relatedId: g.relatedId,
      createdAt: g._max.createdAt, // keep the original time so the list stays in order
    })),
  });
  return missing.length;
}

// Safe to await: it never throws, and a failure just means the user sees
// the notifications they already have.
function backfillBroadcastNotifications(user) {
  if (!user || !user.id || !BROADCAST_ROLES.includes(user.role)) return Promise.resolve(0);
  if (inFlight.has(user.id)) return inFlight.get(user.id);

  const last = lastRun.get(user.id);
  if (last && Date.now() - last < MIN_INTERVAL_MS) return Promise.resolve(0);
  lastRun.set(user.id, Date.now());

  const task = copyMissingBroadcasts(user.id)
    .catch((error) => {
      lastRun.delete(user.id); // try again on the next request
      console.error("Notification catch-up failed:", error.message);
      return 0;
    })
    .finally(() => inFlight.delete(user.id));
  inFlight.set(user.id, task);
  return task;
}

module.exports = { backfillBroadcastNotifications };
