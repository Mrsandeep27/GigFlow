// XSS sanitization middleware — strips HTML tags from all string inputs
// Lightweight, zero-dependency alternative to xss/DOMPurify

const STRIP_TAGS = /<\/?[^>]+(>|$)/g;
const STRIP_SCRIPTS = /javascript:|on\w+\s*=|<script|<\/script/gi;

function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val.replace(STRIP_TAGS, '').replace(STRIP_SCRIPTS, '').trim();
  }
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val && typeof val === 'object') return sanitizeObject(val);
  return val;
}

function sanitizeObject(obj) {
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    // Don't sanitize password fields
    if (key === 'password' || key === 'password_hash') {
      clean[key] = val;
    } else {
      clean[key] = sanitizeValue(val);
    }
  }
  return clean;
}

module.exports = function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};
