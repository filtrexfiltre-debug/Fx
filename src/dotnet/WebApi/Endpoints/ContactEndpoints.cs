namespace Fx.WebApi.Endpoints;

using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Fx.Application.Contacts.Commands;
using Fx.Application.Contacts.Queries;

public static class ContactEndpoints
{
    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/contacts").WithTags("Contacts");

        group.MapGet("/", async (string? search, int? page, int? pageSize, ISender sender) =>
        {
            var query = new GetContactsQuery(search, page ?? 1, pageSize ?? 50);
            var result = await sender.Send(query);
            return Results.Ok(result);
        });

        group.MapPost("/", async (CreateContactCommand command, ISender sender) =>
        {
            var result = await sender.Send(command);
            return Results.Created($"/api/contacts/{result.Id}", result);
        });

        return app;
    }
}
