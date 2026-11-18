import React, { useEffect, useMemo, useState } from "react";
import Chart from "../../components/Chart/Chart";
import axiosApi from "../../conf/axios";
import Loading from "../../components/Loading";
import { useArtist } from "../auth/API/ArtistContext";
import { ChevronDown } from "lucide-react";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";
import FilterSelect from "../../components/FilterSelect/FilterSelect";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSpecialArtistOphId(id) {
  return String(id ?? "")
    .toUpperCase()
    .includes("-SA-");
}

const DEFAULT_MONTH_WINDOW = 6;

/** Order metrics by calendar month (S3 `special_artist_metrics.json` year → month buckets). */
function sortMetricsChronologically(metrics) {
  return [...metrics].sort((a, b) => {
    const yA = parseInt(a.year, 10);
    const yB = parseInt(b.year, 10);
    if (yA !== yB) return yA - yB;
    return MONTH_NAMES.indexOf(a.month) - MONTH_NAMES.indexOf(b.month);
  });
}

function metricMonthStart(item) {
  const monthIndex = MONTH_NAMES.indexOf(item.month);
  const year = parseInt(item.year, 10);
  if (monthIndex < 0 || !Number.isFinite(year)) return null;
  return new Date(year, monthIndex, 1);
}

/** Inclusive current month plus the previous n-1 calendar months. */
function isMetricInLastNCalendarMonths(item, n, now = new Date()) {
  const monthStart = metricMonthStart(item);
  if (!monthStart) return false;
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (n - 1), 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return monthStart >= windowStart && monthStart <= windowEnd;
}

function isMetricInLastNDays(item, days, now = new Date()) {
  const monthStart = metricMonthStart(item);
  if (!monthStart) return false;
  const monthIndex = MONTH_NAMES.indexOf(item.month);
  const monthEnd = new Date(parseInt(item.year, 10), monthIndex + 1, 0);
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);
  return monthEnd >= cutoff && monthStart <= now;
}

export default function KPIDashboard() {
  const { ophid, headers } = useArtist();
  const isSpecialArtist = useMemo(() => isSpecialArtistOphId(ophid), [ophid]);
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [artistImage, setArtistImage] = useState(null);
  const [artistRank, setArtistRank] = useState(null);
  const [selectedContent, setSelectedContent] = useState("");
  const [selectedContentId, setSelectedContentId] = useState(null);
  const [duration, setDuration] = useState(null);

  const durationOptions = [
    { value: 15, label: "Last 15 Days" },
    { value: 30, label: "Last 30 Days" },
  ];

  const fetchRanking = async () => {
    try {
      const response = await axiosApi.get(`/kpi_score`);
      const allData = response.data?.data || {};

      const currentId = String(ophid ?? "").trim();

      const artists = Object.values(allData).map((item) => {
        const id = item.oph_id ?? item.ophid ?? item.OPH_ID ?? item.ophId ?? "";
        return {
          ophId: String(id).trim(),
          stageName: item.stageName,
          personalPhoto: item.personalPhoto ?? item.personal_photo,
          kpiScore: parseFloat(item.kpiScore ?? item.kpi_score ?? 0) || 0,
        };
      });

      artists.sort((a, b) => b.kpiScore - a.kpiScore);

      const index = artists.findIndex((a) => a.ophId === currentId);

      if (index !== -1) {
        setArtistRank(index + 1);
        const photo = artists[index].personalPhoto;
        if (photo) setArtistImage(String(photo).trim());
      } else {
        setArtistRank(null);
      }
    } catch (error) {
      console.error("Error fetching ranking:", error);
    }
  };

  /** KPI map only includes artists with approved songs; load photo from profile when missing. */
  useEffect(() => {
    if (!ophid || !headers?.Authorization || artistImage) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await axiosApi.get("/artist-spotlight/artist-info", {
          headers,
          params: { ophid },
        });
        if (cancelled) return;
        const row = response.data?.data?.[0];
        const photo = row?.personal_photo ?? row?.personalPhoto;
        if (photo) setArtistImage(String(photo).trim());
      } catch {
        /* optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ophid, headers, artistImage]);

  const fetchContent = async () => {
    try {
      const response = await axiosApi.get(`/getKPI?OPH_ID=${ophid}`);
      const metrics = response.data.s3Metrics || [];

      const currentDate = new Date();
      const dayWindow = duration === 15 || duration === 30 ? duration : null;
      const filteredMetrics = sortMetricsChronologically(
        metrics.filter((item) =>
          dayWindow == null
            ? isMetricInLastNCalendarMonths(
                item,
                DEFAULT_MONTH_WINDOW,
                currentDate,
              )
            : isMetricInLastNDays(item, dayWindow, currentDate),
        ),
      );

      const performanceData = [];
      const trafficData = [];
      const songsData = [];
      const audienceData = [];
      const eventsData = [];
      const durationData = [];

      filteredMetrics.forEach((item) => {
        const rawDur = item.avg_view_duration ?? "0:0:0";
        const parts = String(rawDur).split(":").map(Number);
        const h = parts[0] || 0;
        const m = parts[1] || 0;
        const s = parts[2] || 0;
        const totalSeconds = h * 3600 + m * 60 + s;
        const label = `${item.month} ${item.year}`;

        const performanceWeight = artistRank ? Math.round(100 / artistRank) : 0;

        if (!isSpecialArtist) {
          performanceData.push({
            name: label,
            Songs: item.song_count,
            Traffic: item.user_traffic,
            Performance: performanceWeight,
          });
        }

        trafficData.push({
          name: label,
          value: Number(item.user_traffic) || 0,
        });
        songsData.push({
          name: label,
          value: Number(item.song_count) || 0,
        });
        audienceData.push({
          name: label,
          value: Number(item.total_views) || 0,
        });
        eventsData.push({
          name: label,
          value: Number(item.total_accepted_events) || 0,
        });
        durationData.push({ name: label, value: totalSeconds });
      });

      setKpiData({
        performanceData,
        trafficData,
        songsData,
        audienceData,
        eventsData,
        durationData,
      });

      setSelectedContentId(null);
      setSelectedContent(null);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching content:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    setArtistImage(null);
    setArtistRank(null);
  }, [ophid]);

  useEffect(() => {
    if (!ophid) return;

    setLoading(true);
    fetchContent();
    if (!isSpecialArtist) fetchRanking();
  }, [ophid, duration, artistRank, isSpecialArtist]);

  if (error) return <div>Error: {error}</div>;

  return (
    <div className="min-h-[calc(100vh-70px)] px-[16px] py-[16px] lg:px-8 lg:py-6">
      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="w-full flex justify-between items-center flex-wrap gap-3">
            <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
              <NavbarLeft />
              <NavbarRight />
            </div>
            <div>
              <h1 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
                KEY PERFORMANCE INDICATORS
              </h1>
              {/* Special artist only — monthly snapshot note (disabled)
              {isSpecialArtist && (
                <p className="text-sm text-gray-500 max-w-xl">
                  Monthly snapshots from{" "}
                  <span className="text-gray-400">special_artist_metrics</span>{" "}
                  (all months on file, chronological).
                </p>
              )}
              */}
            </div>
            <div className="hidden lg:block">
              <NavbarRight />
            </div>
          </div>

          {!isSpecialArtist && (
            <div className="flex justify-center lg:justify-end">
              <div className="w-full lg:w-48">
                <FilterSelect
                  value={durationOptions.find((o) => o.value === duration)?.label || ""}
                  placeholder="Select Duration"
                  ariaLabel="Duration"
                  options={durationOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                  onChange={(val) => setDuration(Number(val))}
                />
              </div>
            </div>
          )}

          {/* Ranking position — hidden for special artists (no IA KPI leaderboard row) */}
          {!isSpecialArtist &&
            kpiData &&
            kpiData.trafficData &&
            kpiData.trafficData.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="text-white-400">Your Ranking Position</p>
                  <p className="text-xl font-semibold text-cyan-200">
                    {artistRank
                      ? `${String(artistRank).padStart(2, "0")}th`
                      : "N/A"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-700">
                  <img
                    src={artistImage || "/placeholder.svg?height=40&width=40"}
                    alt="Profile"
                    className="w-full h-full rounded-full"
                  />
                </div>
              </div>
            )}

          {/* Charts Grid */}
          <div className="space-y-6">
            {!isSpecialArtist && (
              <Chart
                type="bar"
                data={kpiData?.performanceData || []}
                title="Overall performance"
                subtitle="Combined metrics"
                colors={["#a855f7", "#22d3ee", "#f97316"]}
                stacked={true}
                showLegend={true}
                height={250}
              />
            )}

            {/* Website Traffic */}
            <Chart
              type="area"
              data={kpiData?.trafficData || []}
              title={
                isSpecialArtist
                  ? "Artist page traffic (monthly)"
                  : "Website Artist page traffic"
              }
              subtitle="In Numbers"
              metric={kpiData?.trafficData.reduce(
                (sum, item) => sum + item.value,
                0,
              )}
              colors={["#22c55e"]}
              height={250}
              yFromZero={isSpecialArtist}
            />

            {!isSpecialArtist && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Chart
                  type="line"
                  data={kpiData?.songsData || []}
                  title="Total Number of Songs"
                  subtitle="In Numbers"
                  metric={kpiData?.songsData.reduce(
                    (sum, item) => Math.max(sum, parseInt(item.value, 10)),
                    0,
                  )}
                  colors={["#eab308"]}
                  height={200}
                />

                <Chart
                  type="bar"
                  data={kpiData?.audienceData || []}
                  title="Total Audience Reached"
                  subtitle="In Numbers"
                  metric={kpiData?.audienceData.reduce(
                    (sum, item) => sum + item.value,
                    0,
                  )}
                  colors={["#a855f7"]}
                  height={200}
                />
              </div>
            )}

            {/* Event Participation */}
            <Chart
              type="bar"
              data={kpiData?.eventsData || []}
              title="Event participation (Only Approved)"
              subtitle="In Numbers"
              metric={`${kpiData?.eventsData.reduce(
                (sum, item) => sum + item.value,
                0,
              )} Events`}
              colors={["#22d3ee"]}
              height={250}
              yFromZero={isSpecialArtist}
            />

            {!isSpecialArtist && (
              <Chart
                type="area"
                data={kpiData?.durationData || []}
                title="Average Views Durations"
                subtitle="In Seconds"
                metric={`${
                  kpiData?.durationData?.length
                    ? (
                        kpiData.durationData.reduce(
                          (sum, item) => sum + parseInt(item.value, 10),
                          0,
                        ) / kpiData.durationData.length
                      ).toFixed(0)
                    : "0"
                } Seconds`}
                colors={["#22d3ee"]}
                height={250}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
