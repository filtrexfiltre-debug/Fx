const { queryString } = require('../services/query.cjs');

function requirePermission(permission) {
  return (request, response, next) => {
    if (!request.user?.permissions?.includes(permission)) {
      return response.status(403).json({ message: 'Bu işlem için yetkiniz yok.' });
    }
    next();
  };
}

function requireConsolidatedAccess(request, response, next) {
  const branchId = queryString(request.query.branchId);
  const isCrossBranch = request.user.isGlobal
    ? !branchId || branchId !== request.user.branchId
    : Boolean(branchId && branchId !== request.user.branchId);
  if (isCrossBranch && !request.user.permissions.includes('report.consolidated')) {
    return response.status(403).json({ message: 'Konsolide erişim yetkiniz yok.' });
  }
  next();
}

module.exports = { requirePermission, requireConsolidatedAccess };
