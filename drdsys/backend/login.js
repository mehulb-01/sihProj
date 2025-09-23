const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors()); // Adjust CORS origins in production

const PORT = process.env.PORT || 5000;
const JWT_SECRET = "your_super_secret_jwt_key";

// In-memory user store (replace with DB in production)
const users = new Map();

// Signup API
app.post("/api/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: "Missing fields" });

  if (users.has(username))
    return res.status(409).json({ error: "Username already exists" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(username, { email, password: hashedPassword });
    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing fields" });

  const user = users.get(username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  try {
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Create JWT token
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ message: "Login successful", token });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Protected route example
app.get("/api/dashboard", authenticateToken, (req, res) => {
  // Send dashboard data or confirm user access
  res.json({ message: `Welcome to the dashboard, ${req.user.username}` });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
