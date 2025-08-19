import { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { supabase } from "../lib/supabase";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type EventItem = {
  id: string;
  title: string;
  slots_available: number | null;
};

export function EventParticipationBarChart({ ngoId }: { ngoId: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [participations, setParticipations] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!ngoId) return;
    setLoading(true);

    // Fetch events for the NGO
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, slots_available")
      .eq("ngo_id", ngoId);

    if (eventsError || !eventsData) {
      console.error("Error fetching events:", eventsError);
      setEvents([]);
      setParticipations([]);
      setLoading(false);
      return;
    }

    setEvents(eventsData);

    // For each event, fetch number of confirmed participants
    const participationRates: number[] = [];

    for (const event of eventsData) {
      if (!event.slots_available || event.slots_available === 0) {
        participationRates.push(0);
        continue;
      }

      const { count: confirmedCount, error: regError } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("status", "confirmed");

      if (regError) {
        console.error("Error fetching event registrations:", regError);
        participationRates.push(0);
        continue;
      }

      const count = confirmedCount ?? 0;
      participationRates.push((count / event.slots_available) * 100);
    }

    setParticipations(participationRates);
    setLoading(false);
  }, [ngoId]);

  useEffect(() => {
    fetchData();

    if (!ngoId) return;

    const channel = supabase
      .channel(`participation-chart-${ngoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events", filter: `ngo_id=eq.${ngoId}` },
        fetchData
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_registrations", filter: "status=eq.confirmed" },
        fetchData
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, ngoId]);

  const data = {
    labels: events.map(e => e.title.length > 20 ? e.title.substring(0, 20) + '...' : e.title),
    datasets: [
      {
        label: 'Participation Rate (%)',
        data: participations,
        backgroundColor: '#E11D48', // rose-600
        hoverBackgroundColor: '#BE123C', // rose-700
        borderColor: '#E11D48',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 14 } } },
      tooltip: {
        callbacks: {
          label: (context) =>
            context.parsed.x !== undefined ? `${context.parsed.x.toFixed(2)}%` : "",
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          callback: (val) => `${val}%`,
        },
        grid: {
          color: "#f3f4f6",
        },
      },
      y: {
        grid: {
          color: "#f3f4f6",
        },
      },
    },
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading Participation Data...</div>;
  }

  return (
    <div className="bg-white p-4 rounded shadow-md max-w-4xl mx-auto my-8">
      <h3 className="mb-4 text-lg font-semibold text-center">Event Participation by Event</h3>
      <Bar data={data} options={options} />
    </div>
  );
}
