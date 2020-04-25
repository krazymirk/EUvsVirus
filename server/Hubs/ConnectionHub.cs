using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using server.Models;
using server.Services;

public class ConnectionHub : Hub
{
    private ICacheService _cacheService;
    public ConnectionHub(ICacheService cacheService)
    {
        _cacheService = cacheService;
    }
    public async Task RegisterGuide()
    {
        await Clients.Caller.SendAsync("GuideId", Context.ConnectionId);
    }

    public async Task SendSignalToViewer(string viewerId, string signal)
    {
        await Clients.Client(viewerId).SendAsync("SignalToViewer", signal);
    }

    public async Task SendSignalToGuide(string guideId, string signal)
    {
        await Clients.Client(guideId).SendAsync("SignalToGuide", Context.ConnectionId, signal);
    }

    public async Task SyncPosition(double lat, double lng)
    {
        await _cacheService.SetCacheValueAsync(Context.ConnectionId, JsonConvert.SerializeObject(new Position(){lat = lat, lng = lng}));
        await Clients.Group(Context.ConnectionId).SendAsync("SyncPosition", lat, lng);
    }

    public async Task JoinTour(string guideId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, guideId);
        var str =  await _cacheService.GetCacheValueAsync(guideId);
        var p = JsonConvert.DeserializeObject<Position>(str);
        await Clients.Client(Context.ConnectionId).SendAsync("SyncPosition", p.lat, p.lng);
    }

    public async Task LeaveTour(string guideId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, guideId);
    }

}
