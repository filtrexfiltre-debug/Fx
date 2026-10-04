function notFound(_request, response) {
  response.status(404).json({ message: 'Endpoint bulunamadı.' });
}

function errorHandler(error, _request, response, _next) {
  const status = Number(error.status) || 500;
  response.status(status).json({
    message: status >= 500 ? 'Sunucu hatası.' : error.message || 'İstek tamamlanamadı.',
  });
}

module.exports = { notFound, errorHandler };
