const path = require("path");
const express = require("express");
const fs = require("fs");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ------------------------
// Load users from JSON
// ------------------------
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE, "utf8");
  try {
    return JSON.parse(data || "[]");
  } catch (err) {
    console.error("Error parsing users.json:", err);
    return [];
  }
}

// ------------------------
// Save users to JSON
// ------------------------
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ------------------------
// Signup API
// ------------------------
app.post("/api/signup", async (req, res) => {
  const { username, email, password, referral } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  let users = loadUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ message: "Email already registered" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now(),
    username,
    email,
    password: hashedPassword,
    referral: referral || null
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ message: "Signup successful!" });
});

// ------------------------
// Login API
// ------------------------
app.post("/api/login", async (req, res) => {
  const { user, password } = req.body;

  const users = loadUsers();
  const found = users.find(u => u.email.toLowerCase() === user.toLowerCase() || u.username === user);

  if (!found) return res.status(401).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, found.password);
  if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

  res.json({
    message: "Login successful",
    user: {
      username: found.username,
      referral: found.referral || "REF-" + found.id
    }
  });
});

// ------------------------
// Forgot Password API
// ------------------------
app.post("/api/forgot", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) return res.status(404).json({ message: "Email not registered" });

  // Generate temporary password
  const tempPass = Math.random().toString(36).substring(2, 10).toUpperCase();
  user.password = await bcrypt.hash(tempPass, 10);
  saveUsers(users);

  // Configure Gmail transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Gmail in .env
      pass: process.env.EMAIL_PASS  // App password in .env
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Connect World - Password Reset",
      text: `Hello ${user.username},\n\nYour temporary password is: ${tempPass}\nPlease login and change it immediately.`
    });

    res.json({ message: "Temporary password sent to your email" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

// ------------------------
// Default route
// ------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// ------------------------
// Start server
// ------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
