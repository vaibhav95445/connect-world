const path = require("path");

const express = require("express");
const fs = require("fs");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

 // ✅ Import bcrypt

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Load users from JSON
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  const data = fs.readFileSync(USERS_FILE, "utf8");
  return JSON.parse(data || "[]");
}

// Save users to JSON
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Signup API
app.post("/api/signup", async (req, res) => {
  const { username, email, password, referral } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  let users = loadUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "Email already registered" });
  }

  // ✅ Hash password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = { 
    id: Date.now(), 
    username, 
    email, 
    password: hashedPassword, // store hashed password
    referral: referral || null 
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ message: "Signup successful!" });
});

// Login API
app.post("/api/login", async (req, res) => {
  const { user, password } = req.body;

  let users = loadUsers();
  const found = users.find(
    u => u.email === user || u.username === user
  );

  if (!found) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // ✅ Compare hashed password
  const isMatch = await bcrypt.compare(password, found.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.json({ 
    message: "Login successful", 
    user: {
      username: found.username,
      referral: found.referral || "REF-" + found.id
    }
  });
  

});
// Default route - load signup page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});


// ✅ Only app.listen here, no duplicate const PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});// Start server
// Start server


