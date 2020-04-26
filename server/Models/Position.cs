namespace server.Models
{
  public class Position
  {
      public double Lat {get; set;}
      public double Lng {get; set;}
      public double? Heading { get; set; }
      public double? Pitch { get; set; }
      public double? Zoom { get; set; }

    }
}