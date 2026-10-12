const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

// Verify the token and refresh role/name from the database so role changes take effect
// without trusting stale client-supplied role data.
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication token is missing" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    if (!userId) return res.status(401).json({ success: false, message: "Invalid authentication token" });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    if (!user) return res.status(401).json({ success: false, message: "Account not found" });
    req.user = { ...decoded, ...user, userId: user.id };
    return next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ success: false, message: "Invalid or expired authentication token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
  if (req.user.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin access required" });
  return next();
};

const requireLeaderOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
  if (!["LEADER", "ADMIN"].includes(req.user.role)) return res.status(403).json({ success: false, message: "Leader or Admin access required" });
  return next();
};

module.exports = { authenticateToken, requireAdmin, requireLeaderOrAdmin };
