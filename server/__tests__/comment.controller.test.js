jest.mock("../config/db", () => ({ pool: { query: jest.fn() } }));

const { pool } = require("../config/db");
const {
	validateContent,
	createComment,
	updateComment,
	deleteComment,
	MAX_LENGTH,
} = require("../controllers/comment.controller");

const OWNER_ID = 1;
const OTHER_ID = 2;

const comment = {
	id: 10,
	content: "Hello",
	article_id: 5,
	user_id: OWNER_ID,
	username: "alice",
	avatar: null,
};

const mockRes = () => {
	const res = {};
	res.status = jest.fn().mockReturnValue(res);
	res.json = jest.fn().mockReturnValue(res);
	return res;
};

const mockReq = ({ id = "5", userId = OWNER_ID, body = {} } = {}) => ({
	params: { id },
	userId,
	body,
});

// Was a query matching this SQL fragment executed?
const queried = (fragment) =>
	pool.query.mock.calls.some(([sql]) => sql.includes(fragment));

beforeEach(() => {
	pool.query.mockReset();
});

describe("validateContent", () => {
	it("rejects a non-string value", () => {
		expect(validateContent(undefined).error).toBe("Comment must be a string");
		expect(validateContent(42).error).toBe("Comment must be a string");
	});

	it("rejects empty or whitespace-only content", () => {
		expect(validateContent("").error).toBe("Comment cannot be empty");
		expect(validateContent("  \n\t ").error).toBe("Comment cannot be empty");
	});

	it("rejects content longer than the limit", () => {
		expect(validateContent("a".repeat(MAX_LENGTH + 1)).error).toMatch(
			/cannot exceed/,
		);
	});

	it("accepts content at the limit", () => {
		expect(validateContent("a".repeat(MAX_LENGTH)).error).toBeUndefined();
	});

	it("returns the trimmed content", () => {
		expect(validateContent("  hello  ")).toEqual({ content: "hello" });
	});
});

describe("createComment", () => {
	it("returns 400 and does not query the database when content is invalid", async () => {
		const res = mockRes();
		await createComment(mockReq({ body: { content: "   " } }), res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(pool.query).not.toHaveBeenCalled();
	});

	it("returns 400 when the body is missing", async () => {
		const res = mockRes();
		await createComment({ params: { id: "5" }, userId: OWNER_ID }, res);

		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 404 when the article does not exist", async () => {
		pool.query.mockResolvedValueOnce([[]]);
		const res = mockRes();
		await createComment(mockReq({ body: { content: "Hello" } }), res);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ message: "Article not found" });
		expect(queried("INSERT")).toBe(false);
	});

	it("creates the comment for the logged-in user and returns it with its author", async () => {
		pool.query
			.mockResolvedValueOnce([[{ id: 5 }]]) // article exists
			.mockResolvedValueOnce([{ insertId: 10 }]) // insert
			.mockResolvedValueOnce([[comment]]); // reload with author
		const res = mockRes();
		await createComment(mockReq({ body: { content: "  Hello  " } }), res);

		const insert = pool.query.mock.calls.find(([sql]) => sql.includes("INSERT"));
		expect(insert[1]).toEqual(["Hello", "5", OWNER_ID]);
		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith(comment);
	});

	it("returns a generic 500 without leaking the database error", async () => {
		const spy = jest.spyOn(console, "error").mockImplementation(() => {});
		pool.query.mockRejectedValueOnce(new Error("ER_SECRET: table users"));
		const res = mockRes();
		await createComment(mockReq({ body: { content: "Hello" } }), res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Server error" });
		spy.mockRestore();
	});
});

describe("updateComment", () => {
	it("returns 400 when content is invalid", async () => {
		const res = mockRes();
		await updateComment(mockReq({ id: "10", body: { content: "" } }), res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(pool.query).not.toHaveBeenCalled();
	});

	it("returns 404 when the comment does not exist", async () => {
		pool.query.mockResolvedValueOnce([[]]);
		const res = mockRes();
		await updateComment(mockReq({ id: "10", body: { content: "Edit" } }), res);

		expect(res.status).toHaveBeenCalledWith(404);
	});

	it("returns 403 and does not update when the user is not the author", async () => {
		pool.query.mockResolvedValueOnce([[comment]]);
		const res = mockRes();
		await updateComment(
			mockReq({ id: "10", userId: OTHER_ID, body: { content: "Hacked" } }),
			res,
		);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(queried("UPDATE")).toBe(false);
	});

	it("updates the comment when the user is the author", async () => {
		const updated = { ...comment, content: "Edited" };
		pool.query
			.mockResolvedValueOnce([[comment]]) // ownership check
			.mockResolvedValueOnce([{ affectedRows: 1 }]) // update
			.mockResolvedValueOnce([[updated]]); // reload
		const res = mockRes();
		await updateComment(mockReq({ id: "10", body: { content: "Edited" } }), res);

		const update = pool.query.mock.calls.find(([sql]) => sql.includes("UPDATE"));
		expect(update[1]).toEqual(["Edited", "10"]);
		expect(res.status).not.toHaveBeenCalled(); // default 200
		expect(res.json).toHaveBeenCalledWith(updated);
	});
});

describe("deleteComment", () => {
	it("returns 404 when the comment does not exist", async () => {
		pool.query.mockResolvedValueOnce([[]]);
		const res = mockRes();
		await deleteComment(mockReq({ id: "10" }), res);

		expect(res.status).toHaveBeenCalledWith(404);
	});

	it("returns 403 and does not delete when the user is not the author", async () => {
		pool.query.mockResolvedValueOnce([[comment]]);
		const res = mockRes();
		await deleteComment(mockReq({ id: "10", userId: OTHER_ID }), res);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(queried("DELETE")).toBe(false);
	});

	it("deletes the comment when the user is the author", async () => {
		pool.query
			.mockResolvedValueOnce([[comment]])
			.mockResolvedValueOnce([{ affectedRows: 1 }]);
		const res = mockRes();
		await deleteComment(mockReq({ id: "10" }), res);

		const del = pool.query.mock.calls.find(([sql]) => sql.includes("DELETE"));
		expect(del[1]).toEqual(["10"]);
		expect(res.json).toHaveBeenCalledWith({
			message: "Comment deleted successfully",
		});
	});
});
