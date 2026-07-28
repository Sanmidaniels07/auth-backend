/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Media uploads (images/videos), backed by Cloudinary
 */

/**
 * @swagger
 * /api/uploads:
 *   post:
 *     summary: Upload one or more media files
 *     description: |
 *       Requires authentication. Accepts up to 10 files (field name `files`), 50MB each, as multipart/form-data. Only image (jpeg/png/webp/gif) and video (mp4/quicktime/webm) mime types are accepted.
 *
 *       This is a two-step flow: upload files here first to get back their URLs, then include those URLs in the `media` array when creating or updating a post (`POST /api/posts`, `PATCH /api/posts/{id}`).
 *     tags:
 *       - Upload
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Files uploaded successfully, returns an array of `{ url, type }`
 *       400:
 *         description: No files provided, unsupported file type, or file too large
 *       401:
 *         description: Unauthorized - no or invalid token
 */

export {};
