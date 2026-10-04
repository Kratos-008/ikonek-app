const prisma = require("../lib/prisma");

// Fields returned to the mobile app
const youthSelect = {
  id: true,
  userId: true,
  name: true,
  gender: true,
  age: true,
  birthday: true,
  address: true,
  cellLeader: true,
  category: true,
  image: true,
  createdAt: true,
  updatedAt: true,
};

// Get all youth profiles
const getYouth = async (req, res) => {
  try {
    const youth = await prisma.youthProfile.findMany({
      select: youthSelect,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      youth,
    });
  } catch (error) {
    console.error("Get youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get youth profiles",
    });
  }
};

// Get one youth profile
const getYouthById = async (req, res) => {
  try {
    const { id } = req.params;

    const youth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
      select: youthSelect,
    });

    if (!youth) {
      return res.status(404).json({
        success: false,
        message: "Youth profile not found",
      });
    }

    res.json({
      success: true,
      youth,
    });
  } catch (error) {
    console.error("Get youth by ID error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get youth profile",
    });
  }
};

// Create youth profile
const createYouth = async (req, res) => {
  try {
    const {
      name,
      gender,
      age,
      birthday,
      address,
      cellLeader,
      category,
      image,
    } = req.body;

    // Name is required
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Validate gender
    let normalizedGender = null;

    if (gender !== undefined && gender !== null && gender !== "") {
      if (!["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male or Female",
        });
      }

      normalizedGender = gender;
    }

    // Validate age
    let numericAge = null;

    if (age !== undefined && age !== null && age !== "") {
      numericAge = Number(age);

      if (
        !Number.isInteger(numericAge) ||
        numericAge < 1 ||
        numericAge > 120
      ) {
        return res.status(400).json({
          success: false,
          message: "Age must be a valid number between 1 and 120",
        });
      }
    }

    // Validate category
    let normalizedCategory = null;

    if (category !== undefined && category !== null && category !== "") {
      if (!["Newbie", "Regular"].includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Category must be Newbie or Regular",
        });
      }

      normalizedCategory = category;
    }

    const youth = await prisma.youthProfile.create({
      data: {
        name: name.trim(),
        gender: normalizedGender,
        age: numericAge,

        birthday:
          birthday === undefined ||
          birthday === null ||
          birthday === ""
            ? null
            : String(birthday).trim(),

        address:
          address === undefined ||
          address === null ||
          address === ""
            ? null
            : String(address).trim(),

        cellLeader:
          cellLeader === undefined ||
          cellLeader === null ||
          cellLeader === ""
            ? null
            : String(cellLeader).trim(),

        category: normalizedCategory,

        image:
          image === undefined ||
          image === null ||
          image === ""
            ? null
            : String(image),
      },

      select: youthSelect,
    });

    res.status(201).json({
      success: true,
      message: "Youth profile created successfully",
      youth,
    });
  } catch (error) {
    console.error("Create youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create youth profile",
    });
  }
};

// Update youth profile
const updateYouth = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      gender,
      age,
      birthday,
      address,
      cellLeader,
      category,
      image,
    } = req.body;

    // Check if profile exists
    const existingYouth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
    });

    if (!existingYouth) {
      return res.status(404).json({
        success: false,
        message: "Youth profile not found",
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

    // Gender
    if (gender !== undefined) {
      if (gender === null || gender === "") {
        updateData.gender = null;
      } else if (!["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Gender must be Male or Female",
        });
      } else {
        updateData.gender = gender;
      }
    }

    // Age
    if (age !== undefined) {
      if (age === null || age === "") {
        updateData.age = null;
      } else {
        const numericAge = Number(age);

        if (
          !Number.isInteger(numericAge) ||
          numericAge < 1 ||
          numericAge > 120
        ) {
          return res.status(400).json({
            success: false,
            message: "Age must be a valid number between 1 and 120",
          });
        }

        updateData.age = numericAge;
      }
    }

    // Birthday
    if (birthday !== undefined) {
      updateData.birthday =
        birthday === null || birthday === ""
          ? null
          : String(birthday).trim();
    }

    // Address
    if (address !== undefined) {
      updateData.address =
        address === null || address === ""
          ? null
          : String(address).trim();
    }

    // Cell leader
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

    // Image
    if (image !== undefined) {
      updateData.image =
        image === null || image === ""
          ? null
          : String(image);
    }

    const youth = await prisma.youthProfile.update({
      where: {
        id,
      },
      data: updateData,
      select: youthSelect,
    });

    res.json({
      success: true,
      message: "Youth profile updated successfully",
      youth,
    });
  } catch (error) {
    console.error("Update youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update youth profile",
    });
  }
};

// Delete youth profile
const deleteYouth = async (req, res) => {
  try {
    const { id } = req.params;

    const existingYouth = await prisma.youthProfile.findUnique({
      where: {
        id,
      },
    });

    if (!existingYouth) {
      return res.status(404).json({
        success: false,
        message: "Youth profile not found",
      });
    }

    await prisma.youthProfile.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: "Youth profile deleted successfully",
    });
  } catch (error) {
    console.error("Delete youth error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete youth profile",
    });
  }
};

module.exports = {
  getYouth,
  getYouthById,
  createYouth,
  updateYouth,
  deleteYouth,
};