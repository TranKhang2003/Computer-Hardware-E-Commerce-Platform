// src/routes/comment.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const commentController = require('../controllers/commentController');
const { body } = require('express-validator');
const { optionalAuth } = require('../middlewares/auth.middleware');

// ============================================================
// VALIDATION RULES (FIXED)
// ============================================================

const commentValidation = [
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('Comment is required')
        .isLength({ min: 5, max: 1000 })
        .withMessage('Comment must be between 5 and 1000 characters'),

    body('authorName')
        .optional({ checkFalsy: true })
        .isString()
        .withMessage('Invalid name'),

    body('authorEmail')
        .optional({ checkFalsy: true })
        .isEmail()
        .withMessage('Invalid email format'),

    body('parentId')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent comment ID')
];

const commentUpdateValidation = [
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('Comment is required')
        .isLength({ min: 5, max: 1000 })
        .withMessage('Comment must be between 5 and 1000 characters')
];

// ============================================================
// COMMENT ROUTES
// ============================================================

router.get('/', commentController.getProductComments);
router.get('/count', commentController.getCommentCount);

router.post('/', optionalAuth, commentValidation, commentController.createComment);

router.put('/:commentId', optionalAuth, commentUpdateValidation, commentController.updateComment);

router.delete('/:commentId', optionalAuth, commentController.deleteComment);

module.exports = router;
