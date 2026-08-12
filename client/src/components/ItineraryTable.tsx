import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  rating: number;
  price: number;
  currency: string;
  bookingUrl: string;
  address: {
    cityName: string;
    countryCode: string;
  };
}

interface Activity {
  time: string;
  activity: string;
  type?: string;
  hotel?: Hotel;
}

interface Day {
  dayNumber: number;
  date: string;
  activities: Activity[];
}

interface ItineraryTableProps {
  destination: string;
  days: Day[];
  checkIn: string;
  checkOut: string;
}

export function ItineraryTable({ destination, days, checkIn, checkOut }: ItineraryTableProps) {
  return (
    <Card className="p-4 bg-card border border-border my-4">
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{destination} Itinerary</h3>
        <p className="text-sm text-muted-foreground">{checkIn} to {checkOut}</p>
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <div key={day.dayNumber} className="border-l-2 border-primary pl-4">
            <div className="font-semibold text-sm mb-2">
              Day {day.dayNumber} — {day.date}
            </div>
            
            <div className="space-y-2 text-sm">
              {day.activities.map((activity, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-muted-foreground min-w-20">{activity.time}</span>
                  <div className="flex-1">
                    <div>{activity.activity}</div>
                    {activity.hotel && (
                      <div className="mt-1 p-2 bg-muted rounded text-xs">
                        <div className="font-medium">{activity.hotel.name}</div>
                        {activity.hotel.price && (
                          <div className="text-muted-foreground">${activity.hotel.price}/night</div>
                        )}
                        <a
                          href={activity.hotel.bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 mt-1"
                        >
                          View booking <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
        <p>Does this itinerary work for you? Let me know if you'd like to change anything.</p>
      </div>
    </Card>
  );
}
