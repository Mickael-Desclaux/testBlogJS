import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { COMMENT_MAX_LENGTH } from "../config";
import { getCommentErrorMessage } from "../utils/commentError";
import CommentItem from "./CommentItem";

const CommentSection = ({ articleId, initialComments = [] }) => {
	const { user } = useAuth();
	const [comments, setComments] = useState(initialComments);
	const [content, setContent] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (content.trim() === "") {
			setError("Le commentaire ne peut pas être vide.");
			return;
		}
		setBusy(true);
		setError("");
		try {
			const { data } = await API.post(`/articles/${articleId}/comments`, {
				content,
			});
			setComments((prev) => [...prev, data]);
			setContent("");
		} catch (err) {
			setError(getCommentErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};

	const handleUpdated = (updated) =>
		setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

	const handleDeleted = (id) =>
		setComments((prev) => prev.filter((c) => c.id !== id));

	return (
		<section className="comment-section">
			<h2 className="comment-title">
				<MessageSquare size={22} /> Commentaires ({comments.length})
			</h2>

			{user ? (
				<form onSubmit={handleSubmit} className="glass comment-form">
					<textarea
						rows="4"
						placeholder="Écrivez un commentaire..."
						value={content}
						maxLength={COMMENT_MAX_LENGTH}
						onChange={(e) => setContent(e.target.value)}
						disabled={busy}
					/>
					<div className="comment-form-footer">
						<span className="comment-hint">
							Markdown supporté · {content.length}/{COMMENT_MAX_LENGTH}
						</span>
						<button type="submit" disabled={busy} className="btn btn-primary">
							{busy ? "Envoi..." : "Publier"}
						</button>
					</div>
					{error && <div className="comment-error">{error}</div>}
				</form>
			) : (
				<p className="glass comment-login">
					<Link to="/login">Connectez-vous</Link> pour laisser un commentaire.
				</p>
			)}

			{comments.length === 0 ? (
				<p className="comment-empty">Aucun commentaire pour le moment.</p>
			) : (
				<ul className="comment-list">
					{comments.map((comment) => (
						<CommentItem
							key={comment.id}
							comment={comment}
							onUpdated={handleUpdated}
							onDeleted={handleDeleted}
						/>
					))}
				</ul>
			)}
		</section>
	);
};

export default CommentSection;
