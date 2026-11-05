// API messages are in English: show a French message to the user based on the status
const MESSAGES = {
	400: "Le commentaire est vide ou trop long.",
	401: "Votre session a expiré, reconnectez-vous.",
	403: "Vous ne pouvez modifier ou supprimer que vos propres commentaires.",
	404: "Ce commentaire ou cet article n'existe plus.",
	429: "Trop de commentaires envoyés, réessayez dans une minute.",
};

export function getCommentErrorMessage(err) {
	return (
		MESSAGES[err?.response?.status] ??
		"Une erreur est survenue, réessayez plus tard."
	);
}
