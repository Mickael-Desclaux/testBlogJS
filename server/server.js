const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const multer = require("multer");
const path = require("path");
const { initDB } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const articleRoutes = require("./routes/article.routes");
const userRoutes = require("./routes/user.routes");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/users", userRoutes);

// Basic route
app.get("/", (req, res) => {
	res.send("Blog API is running...");
});

// Global error handler
app.use((err, req, res, next) => {
	const status =
		err instanceof multer.MulterError
			? 400
			: err.status || err.statusCode || 500;

	if (status >= 500) {
		console.error(err);
		return res.status(status).json({ message: "Server error" });
	}
	res.status(status).json({ message: err.message });
});

if (require.main === module) {
	initDB();
	app.listen(PORT, () => {
		console.log(
			`Server is running on port ${PORT} (CORS origin: ${CLIENT_URL})`,
		);
	});
}

module.exports = app;
