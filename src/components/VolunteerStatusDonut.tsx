import { useEffect, useState, useCallback } from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { supabase } from "../lib/supabase";

ChartJS.register(ArcElement, Tooltip, Legend);

type VolunteerStatusCounts = {
  active: number;
  pending: number;
  past: number;
};

export function VolunteerStatusDonut({ ngoId }: { ngoId: string }) {
  const [counts, setCounts] = useState<VolunteerStatusCounts>({
    active: 0,
    pending: 0,
    past: 0,
  });

  const fetchCounts = useCallback(async () => {
    if (!ngoId) return;

    // Active volunteers (confirmed)
    const { count: activeCount } = await supabase
      .from("ngo_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("ngo_id", ngoId)
      .eq("status", "confirmed");

    // Pending volunteers
    const { count: pendingCount } = await supabase
      .from("ngo_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("ngo_id", ngoId)
      .eq("status", "pending");

    // Past volunteers (rejected)
    const { count: pastCount } = await supabase
      .from("ngo_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("ngo_id", ngoId)
      .eq("status", "rejected");

    setCounts({
      active: activeCount ?? 0,
      pending: pendingCount ?? 0,
      past: pastCount ?? 0,
    });
  }, [ngoId]);

  useEffect(() => {
    fetchCounts();

    if (!ngoId) return;

    const channel = supabase
      .channel(`volunteer-status-${ngoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ngo_enrollments",
          filter: `ngo_id=eq.${ngoId}`,
        },
        fetchCounts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCounts, ngoId]);

  const data = {
    labels: ["Active", "Pending", "Past"],
    datasets: [
      {
        data: [
          counts.active ?? 0,
          counts.pending ?? 0,
          counts.past ?? 0,
        ],
        backgroundColor: ["#E11D48", "#F59E0B", "#9CA3AF"], // rose-600, amber-500, gray-400
        hoverBackgroundColor: ["#BE123C", "#D97706", "#6B7280"], // rose-700, amber-600, gray-500
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 20,
          padding: 15,
          font: {
            size: 14,
          },
        },
      },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="relative max-w-xs mx-auto text-center p-6 bg-white rounded-lg shadow-md">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold">{counts.active + counts.pending + counts.past}</span>
        <span className="text-sm text-gray-500">Total Volunteers</span>
      </div>
    </div>
  );
}
