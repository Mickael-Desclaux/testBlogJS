import { Edit, Trash2, User } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/axios";
import { API_URL, COMMENT_MAX_LENGTH } from "../config";
import { useAuth } from "../context/AuthContext";
import { getCommentErrorMessage } from "../utils/commentError";
import { renderComment } from "../utils/renderComment";

const formatDate = (date) =>
	new Date(date).toLocaleString("fr-FR", {
		dateStyle: "short",
		timeStyle: "short",
	});

const CommentItem = ({ comment, onUpdated, onDeleted }) => {
	const { user } = useAuth();
	const [isEditing, setIsEditing] = useState(false);
	const [draft, setDraft] = useState(comment.content);
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);

	const isAuthor = user && user.id === comment.user_id;
	const isEdited = comment.updated_at !== comment.created_at;

	const startEditing = () => {
		setDraft(comment.content);
		setError("");
		setIsEditing(true);
	};

	const handleSave = async () => {
		if (draft.trim() === "") {
			setError("Le commentaire ne peut pas être vide.");
			return;
		}
		setBusy(true);
		setError("");
		try {
			const { data } = await API.put(`/comments/${comment.id}`, {
				content: draft,
			});
			onUpdated(data);
			setIsEditing(false);
		} catch (err) {
			setError(getCommentErrorMessage(err));
		} finally {
			setBusy(false);
		}
	};

	const handleDelete = async () => {
		if (!window.confirm("Voulez-vous vraiment supprimer ce commentaire ?"))
			return;
		setBusy(true);
		setError("");
		try {
			await API.delete(`/comments/${comment.id}`);
			onDeleted(comment.id);
		} catch (err) {
			setError(getCommentErrorMessage(err));
			setBusy(false);
		}
	};

	return (
		<li className="glass comment-item">
			<div className="comment-header">
				<div className="comment-author">
					{comment.avatar ? (
						<img
							src={`${API_URL}${comment.avatar}`}
							alt={comment.username}
							className="comment-avatar"
						/>
					) : (
						<User size={20} />
					)}
					<div>
						<Link
							to={`/profile/${comment.user_id}`}
							style={{ fontWeight: "bold" }}
						>
							{comment.username}
						</Link>
						<div className="comment-date">
							{formatDate(comment.created_at)}
							{isEdited && " (modifié)"}
						</div>
					</div>
				</div>

				{isAuthor && !isEditing && (
					<div className="comment-actions">
						<button
							onClick={startEditing}
							disabled={busy}
							className="btn glass"
							title="Modifier"
						>
							<Edit size={14} />
						</button>
						<button
							onClick={handleDelete}
							disabled={busy}
							className="btn btn-danger"
							title="Supprimer"
						>
							<Trash2 size={14} />
						</button>
					</div>
				)}
			</div>

			{isEditing ? (
				<div>
					<textarea
						rows="4"
						value={draft}
						maxLength={COMMENT_MAX_LENGTH}
						onChange={(e) => setDraft(e.target.value)}
						disabled={busy}
					/>
					<div className="comment-actions">
						<button
							onClick={handleSave}
							disabled={busy}
							className="btn btn-primary"
						>
							Enregistrer
						</button>
						<button
							onClick={() => setIsEditing(false)}
							disabled={busy}
							className="btn glass"
						>
							Annuler
						</button>
					</div>
				</div>
			) : (
				<div
					className="comment-content"
					dangerouslySetInnerHTML={{ __html: renderComment(comment.content) }}
				/>
			)}

			{error && <div className="comment-error">{error}</div>}
		</li>
	);
};

export default CommentItem;
