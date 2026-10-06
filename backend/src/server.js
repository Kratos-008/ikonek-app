require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const youthRoutes = require("./routes/youth");
const eventRoutes = require("./routes/events");
const attendanceRoutes = require("./routes/attendance");
const prayerRoutes = require("./routes/prayer");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Church Youth App backend is running!",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/youth", youthRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attendance", attendanceRoutes);

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.originalUrl);
  next();
});

app.use("/api/prayer", prayerRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
