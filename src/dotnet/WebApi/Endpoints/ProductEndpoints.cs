namespace Fx.WebApi.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Fx.Application.Products.Commands;
using Fx.Application.Products.Queries;

public static class ProductEndpoints
{
    public static IEndpointRouteBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/products").WithTags("Products");

        group.MapGet("/", async (string? search, int? page, int? pageSize, ISender sender) =>
        {
            var query = new GetProductsQuery(search, page ?? 1, pageSize ?? 50);
            var result = await sender.Send(query);
            return Results.Ok(result);
        });

        group.MapPost("/", async (CreateProductCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return Results.Created($"/api/products/{result.Id}", result);
        });

        return app;
    }
}
