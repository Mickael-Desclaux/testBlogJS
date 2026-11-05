const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const commentLimiter = rateLimit({
	windowMs: 60 * 1000,
	limit: 5,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	keyGenerator: (req) =>
		req.userId ? `user-${req.userId}` : ipKeyGenerator(req.ip),
	message: { message: "Too many comments, please try again in a minute" },
});

module.exports = { commentLimiter };
