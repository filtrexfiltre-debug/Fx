namespace Fx.WebApi.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Fx.Application.Transfers.Commands.ApproveTransfer;
using Fx.Application.Transfers.Commands.CreateTransfer;

public static class TransferEndpoints
{
    public static IEndpointRouteBuilder MapTransferEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/transfers").WithTags("InterBranchTransfers");

        group.MapPost("/", async (CreateTransferCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return Results.Ok(result);
        });

        group.MapPost("/{id:guid}/approve", async (Guid id, ApproveTransferRequest? request, ISender sender) =>
        {
            var command = new ApproveTransferCommand(id, request?.ApprovalNote);
            var result = await sender.Send(command);
            return Results.Ok(result);
        });

        return app;
    }
}

public record ApproveTransferRequest(string? ApprovalNote);
