const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");

// Fields returned to the frontend
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  age: true,
  sex: true,
  address: true,
  cellLeader: true,
  category: true,
  createdAt: true,
  updatedAt: true,
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get users",
    });
  }
};

// Get one user
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      password,
      role,
      age,
      sex,
      address,
      cellLeader,
      category,
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = {};

    // Name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      updateData.name = name.trim();
    }

    // Email
    if (email !== undefined) {
      if (typeof email !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid email",
        });
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email cannot be empty",
        });
      }

      const emailExists = await prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email is already being used",
        });
      }

      updateData.email = normalizedEmail;
    }

    // Password
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }

      updateData.password = await bcrypt.hash(password, 10);
    }

    // Role
    if (role !== undefined) {
      if (!["YOUTH", "ADMIN"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role",
        });
      }

      updateData.role = role;
    }

    // Age
    if (age !== undefined) {
      if (age === null || age === "") {
        updateData.age = null;
      } else {
        const numericAge = Number(age);

        if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
          return res.status(400).json({
            success: false,
            message: "Age must be a valid number between 1 and 120",
          });
        }

        updateData.age = numericAge;
      }
    }

    // Sex
    if (sex !== undefined) {
      if (sex === null || sex === "") {
        updateData.sex = null;
      } else if (!["Male", "Female"].includes(sex)) {
        return res.status(400).json({
          success: false,
          message: "Sex must be Male or Female",
        });
      } else {
        updateData.sex = sex;
      }
    }

    // Address
    if (address !== undefined) {
      updateData.address =
        address === null || address === ""
          ? null
          : String(address).trim();
    }

    // Cell Leader
    if (cellLeader !== undefined) {
      updateData.cellLeader =
        cellLeader === null || cellLeader === ""
          ? null
          : String(cellLeader).trim();
    }

    // Category
    if (category !== undefined) {
      if (category === null || category === "") {
        updateData.category = null;
      } else if (!["Newbie", "Regular"].includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Category must be Newbie or Regular",
        });
      } else {
        updateData.category = category;
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: {
        id,
      },
      data: updateData,
      select: userSelect,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await prisma.user.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};