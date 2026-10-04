const express = require('express');
const { auditRepository } = require('../repositories/index.cjs');
const { authenticate } = require('../middleware/auth.cjs');
const { requirePermission, requireConsolidatedAccess } = require('../middleware/permissions.cjs');
const { createRateLimiter } = require('../middleware/rateLimit.cjs');
const { rateLimitMax, rateLimitWindowMs } = require('../config.cjs');
const { queryString, buildScope } = require('../services/query.cjs');

const router = express.Router();
router.use(createRateLimiter({ windowMs: rateLimitWindowMs, max: rateLimitMax }));
router.use(authenticate);

router.post('/', requirePermission('audit.write'), async (request, response, next) => {
  if (typeof request.body?.action !== 'string' || !request.body.action.trim()) {
    return response.status(400).json({ message: 'Denetim işlemi gereklidir.' });
  }
  try {
    const entry = await auditRepository.create(request.body, request.user);
    response.status(201).json({ data: entry });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('audit.read'), requireConsolidatedAccess, async (request, response, next) => {
  if (queryString(request.query.format) === 'csv' && !request.user.permissions.includes('audit.export')) {
    return response.status(403).json({ message: 'CSV dışa aktarma yetkiniz yok.' });
  }
  const scope = buildScope(request.query, request.user);
  const { limit, offset } = scope;
  try {
    const result = await auditRepository.list(scope, request.user);
    if (queryString(request.query.format) === 'csv') {
      response.type('text/csv; charset=utf-8');
      response.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
      return response.send(toCsv(result.rows));
    }
    response.json({ ...result, limit, offset });
  } catch (error) {
    next(error);
  }
});

function toCsv(rows) {
  const headers = ['id', 'createdAt', 'branchId', 'userId', 'userName', 'action', 'resourceType', 'resourceId', 'details'];
  const cell = (value) => {
    let text = value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${[headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(cell).join(';')).join('\r\n')}`;
}

module.exports = router;
