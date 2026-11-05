const { pool } = require("../config/db");

const MAX_LENGTH = 2000;

const COMMENT_WITH_AUTHOR = `
	SELECT comments.*, users.username, users.avatar
	FROM comments
	JOIN users ON comments.user_id = users.id
`;

// Returns { error } or { content } (trimmed)
const validateContent = (content) => {
	if (typeof content !== "string")
		return { error: "Comment must be a string" };

	const trimmed = content.trim();
	if (trimmed.length === 0)
		return { error: "Comment cannot be empty" };
	if (trimmed.length > MAX_LENGTH)
		return {
			error: `Comment cannot exceed ${MAX_LENGTH} characters`,
		};

	return { content: trimmed };
};

const getCommentById = async (id) => {
	const [rows] = await pool.query(`${COMMENT_WITH_AUTHOR} WHERE comments.id = ?`, [
		id,
	]);
	return rows[0];
};

const serverError = (res, err) => {
	console.error(err);
	res.status(500).json({ message: "Server error" });
};

exports.MAX_LENGTH = MAX_LENGTH;
exports.validateContent = validateContent;

exports.getCommentsByArticleId = async (articleId) => {
	const [rows] = await pool.query(
		`${COMMENT_WITH_AUTHOR} WHERE comments.article_id = ? ORDER BY comments.created_at ASC, comments.id ASC`,
		[articleId],
	);
	return rows;
};

exports.createComment = async (req, res) => {
	try {
		const { error, content } = validateContent(req.body?.content);
		if (error) return res.status(400).json({ message: error });

		const [articles] = await pool.query("SELECT id FROM articles WHERE id = ?", [
			req.params.id,
		]);
		if (articles.length === 0)
			return res.status(404).json({ message: "Article not found" });

		const [result] = await pool.query(
			"INSERT INTO comments (content, article_id, user_id) VALUES (?, ?, ?)",
			[content, req.params.id, req.userId],
		);

		res.status(201).json(await getCommentById(result.insertId));
	} catch (err) {
		serverError(res, err);
	}
};

exports.updateComment = async (req, res) => {
	try {
		const { error, content } = validateContent(req.body?.content);
		if (error) return res.status(400).json({ message: error });

		const comment = await getCommentById(req.params.id);
		if (!comment)
			return res.status(404).json({ message: "Comment not found" });
		if (comment.user_id !== req.userId)
			return res.status(403).json({ message: "Not authorized" });

		await pool.query("UPDATE comments SET content = ? WHERE id = ?", [
			content,
			req.params.id,
		]);

		res.json(await getCommentById(req.params.id));
	} catch (err) {
		serverError(res, err);
	}
};

exports.deleteComment = async (req, res) => {
	try {
		const comment = await getCommentById(req.params.id);
		if (!comment)
			return res.status(404).json({ message: "Comment not found" });
		if (comment.user_id !== req.userId)
			return res.status(403).json({ message: "Not authorized" });

		await pool.query("DELETE FROM comments WHERE id = ?", [req.params.id]);
		res.json({ message: "Comment deleted successfully" });
	} catch (err) {
		serverError(res, err);
	}
};
