using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

public class ConnectionHub : Hub
{
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
}
