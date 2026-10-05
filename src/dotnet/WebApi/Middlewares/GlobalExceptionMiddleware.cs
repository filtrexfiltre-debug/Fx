namespace Fx.WebApi.Middlewares;

using System.Net;
using System.Text.Json;
using FluentValidation;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    private readonly RequestDelegate _next = next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger = logger;

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse();

        switch (exception)
        {
            case ValidationException validationException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Code = "BAD_REQUEST";
                response.Message = "Validasyon hatası oluştu.";
                response.Errors = validationException.Errors.Select(e => e.ErrorMessage).ToList();
                break;

            case KeyNotFoundException notFoundException:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                response.Code = "NOT_FOUND";
                response.Message = notFoundException.Message;
                break;

            case UnauthorizedAccessException unauthorizedException:
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden;
                response.Code = "FORBIDDEN";
                response.Message = unauthorizedException.Message;
                break;

            case InvalidOperationException invalidOpException:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.Code = "BAD_REQUEST";
                response.Message = invalidOpException.Message;
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.Code = "SERVER_ERROR";
                response.Message = "Sunucuda beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyiniz.";
                break;
        }

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        return context.Response.WriteAsync(json);
    }
}

public class ErrorResponse
{
    public string Code { get; set; } = "UNKNOWN";
    public string Message { get; set; } = string.Empty;
    public List<string>? Errors { get; set; }
}
