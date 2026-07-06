const multer = require('multer');
const os = require('os');

const ALLOWED_MIME_TYPES = new Set(['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a']);
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only MP3 or M4A audio files are supported.'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { upload };
