require("dotenv").config();

const prisma = require("../src/lib/prisma");
const bcrypt = require("bcryptjs");

async function createAdmin() {
  const name = "Church Admin";
  const email = "church@admin.com";
  const password = "mgnbc2026";

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("User already exists.");

      if (existingUser.role !== "ADMIN") {
        await prisma.user.update({  
          where: { id: existingUser.id },
          data: { role: "ADMIN" },
        });

        console.log("Existing user promoted to ADMIN.");
      } else {
        console.log("User is already ADMIN.");
      }

      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Admin created successfully:");
    console.log({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
  } catch (error) {
    console.error("Failed to create admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();