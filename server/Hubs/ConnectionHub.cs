using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using server.Models;
using server.Services;

public class ConnectionHub : Hub
{
    private readonly ICacheService _cacheService;
    private readonly TourService _tourService;
    private readonly IMemoryCache _memory;

    private const string activePrefix = "active_";

    private const string activeIdPrefix = "activeId_";

    public ConnectionHub(ICacheService cacheService, TourService tourService, IMemoryCache memory)
    {
        _cacheService = cacheService;
        _tourService = tourService;
        _memory = memory;
    }

    public override async Task OnDisconnectedAsync(Exception exception)
    {
        var idKey = activeIdPrefix + Context.ConnectionId;
        if(_memory.TryGetValue(idKey, out var hash))
        {
            var activeKey = activePrefix + hash;
            if(_memory.TryGetValue(activeKey, out var connectionId) && (string)connectionId == Context.ConnectionId)
            {
                _memory.Remove(idKey);
                _memory.Remove(activePrefix + hash);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task RegisterGuide(string tourHash)
    {
        var tour = await this._tourService.Get(tourHash);
        tour.GuideId = Context.ConnectionId;
        await _tourService.Set(tour);
        await Clients.Caller.SendAsync("GuideId", Context.ConnectionId);
        await Clients.Group(tour.TourHash).SendAsync("ActivateTour");
    }

    public async Task SendSignalToViewer(string viewerId, string signal)
    {
        await Clients.Client(viewerId).SendAsync("SignalToViewer", signal);
    }

    public async Task SendSignalToGuide(string tourHash, string signal)
    {
        if (_tourService.IsPrivateAndInUse(tourHash, Context.ConnectionId))
        {
            return;
        }
        else if (tourHash.StartsWith("_"))
        {
            _memory.Set(activeIdPrefix + Context.ConnectionId, tourHash);
            _memory.Set(activePrefix + tourHash, Context.ConnectionId);
        }

        var tour = await this._tourService.Get(tourHash);
        await Clients.Client(tour.GuideId).SendAsync("SignalToGuide", Context.ConnectionId, signal);
    }

    public async Task SyncPosition(string tourHash, double lat, double lng, double heading, double pitch, double zoom)
    {
        var tour = await this._tourService.GetByGuideHash(tourHash);
        await _cacheService.SetCacheValueAsync("position_" + tour.TourHash, JsonConvert.SerializeObject(new Position(){Lat = lat, Lng = lng, Heading = heading, Pitch = pitch, Zoom = zoom}));
        await Clients.Group(tour.TourHash).SendAsync("SyncPosition", lat, lng, heading, pitch, zoom);
    }

    public async Task JoinTour(string tourHash)
    {
        if (_tourService.IsPrivateAndInUse(tourHash, Context.ConnectionId))
        {
            return;
        }

        var tour = await this._tourService.Get(tourHash);
        await Groups.AddToGroupAsync(Context.ConnectionId, tour.TourHash);
        var str =  await _cacheService.GetCacheValueAsync("position_" + tour.TourHash);
        if(str != null) {
            var p = JsonConvert.DeserializeObject<Position>(str);
            await Clients.Client(Context.ConnectionId).SendAsync("SyncPosition", p.Lat, p.Lng, p.Heading, p.Pitch, p.Zoom);
        }
    }

    public async Task LeaveTour(string guideId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, guideId);
    }

    public async Task AskQuestion(string tourHash, string question, string nickname)
    {   
        if (_tourService.IsPrivateAndInUse(tourHash, Context.ConnectionId))
        {
            return;
        }

        var tour = await this._tourService.Get(tourHash);

        await Clients.Client(tour.GuideId).SendAsync("Question", question, nickname);
    }

}
