const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const verifyToken = require("../middleware/auth");

router.put("/:id", verifyToken, commentController.updateComment);
router.delete("/:id", verifyToken, commentController.deleteComment);

module.exports = router;
