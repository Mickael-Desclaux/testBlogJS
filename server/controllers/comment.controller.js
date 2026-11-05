const { pool } = require("../config/db");

exports.getCommentsByArticleId = async (articleId) => {
	const [rows] = await pool.query(
		`
        SELECT comments.*, users.username, users.avatar
        FROM comments
        JOIN users ON comments.user_id = users.id
        WHERE comments.article_id = ?
        ORDER BY comments.created_at ASC
    `,
		[articleId],
	);
	return rows;
};
