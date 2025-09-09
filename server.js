const express = require("express");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// Middleware
app.use(bodyParser.json());
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

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Signup API
app.post("/api/signup", (req, res) => {
  const { username, email, password, referral } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  let users = loadUsers();
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const newUser = { 
    id: Date.now(), 
    username, 
    email, 
    password, 
    referral: referral || null 
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ message: "Signup successful!" });
});

// Login API
app.post("/api/login", (req, res) => {
  const { user, password } = req.body;

  let users = loadUsers();
  const found = users.find(
    u => (u.email === user || u.username === user) && u.password === password
  );

  if (!found) {
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

// Forgot Password API
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  let users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Generate reset token (for demo, simple token; use secure token in production)
  const resetToken = Math.random().toString(36).substr(2, 8);

  // Configure NodeMailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'your-email@gmail.com', pass: 'your-email-password' } // Use App Password if Gmail 2FA
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: email,
    subject: 'Password Reset - Connect World',
    text: `Hello ${user.username},\n\nClick the link to reset your password:\nhttp://localhost:3000/reset-password.html?token=${resetToken}\n\nIf you didn't request this, ignore this email.`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: `Password reset link sent to ${email}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error sending email, try again later" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

