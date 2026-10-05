namespace Fx.Application.Common.Behaviors;

using MediatR;
using Microsoft.Extensions.Logging;
using Fx.Application.Common.Interfaces;

public interface ITransactionalCommand;

public class TransactionBehavior<TRequest, TResponse>(
    IApplicationDbContext dbContext,
    ILogger<TransactionBehavior<TRequest, TResponse>> logger
) : IPipelineBehavior<TRequest, TResponse>
    where TRequest : ITransactionalCommand
{
    private readonly IApplicationDbContext _dbContext = dbContext;
    private readonly ILogger<TransactionBehavior<TRequest, TResponse>> _logger = logger;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        _logger.LogInformation("Beginning atomic transaction for {RequestName}", requestName);

        await using var transaction = await _dbContext.BeginTransactionAsync(cancellationToken);

        try
        {
            var response = await next();
            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation("Committed atomic transaction for {RequestName}", requestName);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Rolling back transaction for {RequestName} due to error", requestName);
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
