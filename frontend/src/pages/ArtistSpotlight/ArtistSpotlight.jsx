import React, { useEffect, useState } from "react";
import axiosApi from "../../conf/axios";
import { useSelector } from "react-redux";
import { useArtist } from "../auth/API/ArtistContext";
import { useNavigate } from "react-router-dom";
import {
  navigateToArtistDetail,
  resolveLeaderboardOphId,
} from "../../utils/artistHash";

import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

const ARTIST_SPOTLIGHT_EMPTY_NOTE = "No Note Provided Yet.";
const LEADERBOARD_UI_MAX_ROWS = 10;

function formatReach(views) {
  const n = Number(views ?? 0);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K+`;
  return `${n.toLocaleString()}+`;
}

function rankBadgeVisualClass(rank) {
  if (rank === 1) return "bg-yellow-400 text-black ring-2 ring-yellow-200/60";
  if (rank === 2) return "bg-emerald-400 text-black ring-2 ring-emerald-200/60";
  if (rank === 3) return "bg-cyan-400 text-black ring-2 ring-cyan-200/60";
  return "bg-[#1f2937] text-white ring-2 ring-[#5DC9DE]";
}

function Leaderboard({ leaderboardData, artistId }) {
  const navigate = useNavigate();
  const { headers, ophid } = useArtist();

  const myOphId = String(ophid ?? artistId ?? "").trim();
  const fullList = Array.isArray(leaderboardData) ? leaderboardData : [];
  const meRow = myOphId
    ? fullList.find((entry) => resolveLeaderboardOphId(entry) === myOphId)
    : null;
  const meRankRaw = meRow?.ranks ?? meRow?.rank;
  const meRank =
    meRankRaw != null && meRankRaw !== "" ? Number(meRankRaw) : null;
  const meRankValid = Number.isFinite(meRank) ? meRank : null;

  const goToArtistProfile = (ophId) => {
    if (!ophId) return;
    void navigateToArtistDetail(
      navigate,
      ophId,
      headers?.Authorization ? headers : null,
    );
  };

  const rows = Array.isArray(leaderboardData)
    ? leaderboardData.slice(0, LEADERBOARD_UI_MAX_ROWS)
    : [];

  return (
    <div className="lg:px-0">
      <div
        className={`mb-6 rounded-xl border px-4 py-5 ${
          meRankValid != null
            ? "border-[#5DC9DE]/35 bg-gray-800/50"
            : "border-gray-700/60 bg-gray-800/30"
        }`}
      >
        {/* Mobile: centered stack */}
        <div className="flex flex-col items-center text-center gap-2 lg:hidden">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold tabular-nums ${
              meRankValid != null ? rankBadgeVisualClass(meRankValid) : "bg-gray-700 text-gray-400"
            }`}
          >
            {meRankValid != null ? String(meRankValid).padStart(2, "0") : "–"}
          </span>
          <p className="text-base font-extrabold uppercase tracking-widest text-white">Your Position</p>
          {meRankValid != null ? (
            <p className="text-sm text-gray-400">#{meRankValid} on community leaderboard</p>
          ) : (
            <p className="text-sm text-gray-400">Not on the leaderboard yet</p>
          )}
          {meRow && meRankValid != null && (
            <>
              <div className="mt-2 flex w-full justify-around text-sm">
                <div>
                  <p className="text-gray-500 uppercase text-xs tracking-wide">Songs</p>
                  <p className="font-bold text-white">{meRow.song_count ?? meRow.songCount ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-xs tracking-wide">Stage Name</p>
                  <p className="font-bold text-white">{meRow.stage_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-gray-500 uppercase text-xs tracking-wide">Reach</p>
                  <p className="font-bold text-white">{formatReach(meRow.total_views ?? meRow.Total_views ?? meRow.totalViews)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => goToArtistProfile(myOphId)}
                className="mt-3 w-full rounded-full bg-[#6F4fca] py-2 text-sm font-medium text-white hover:bg-[#6F4FA0] transition-colors"
              >
                View Profile
              </button>
            </>
          )}
        </div>

        {/* Desktop: horizontal layout */}
        <div className="hidden lg:flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold tabular-nums ${
                meRankValid != null ? rankBadgeVisualClass(meRankValid) : "bg-gray-700 text-gray-400 ring-2 ring-gray-600"
              }`}
            >
              {meRankValid != null ? meRankValid : "–"}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Your Position</p>
              {meRankValid != null ? (
                <p className="text-lg font-bold text-white">
                  #{meRankValid} <span className="font-normal text-gray-400">on the community leaderboard</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not on the leaderboard yet</p>
              )}
            </div>
          </div>
          {meRow && meRankValid != null && (
            <div className="flex items-center gap-6 text-sm text-gray-300">
              <span>
                <span className="text-gray-500">Stage: </span>
                <span className="font-medium text-[#5DC9DE]">{meRow.stage_name ?? "—"}</span>
              </span>
              <span>
                <span className="text-gray-500">Songs: </span>
                <span className="font-bold text-white">{meRow.song_count ?? meRow.songCount ?? "—"}</span>
              </span>
              <span>
                <span className="text-gray-500">Reach: </span>
                <span className="font-bold text-white">{formatReach(meRow.total_views ?? meRow.Total_views ?? meRow.totalViews)}</span>
              </span>
              <button
                type="button"
                onClick={() => goToArtistProfile(myOphId)}
                className="shrink-0 rounded-lg border border-[#5DC9DE]/50 px-4 py-2 text-sm font-medium text-[#5DC9DE] hover:bg-[#5DC9DE]/10 transition-colors"
              >
                View Profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 lg:hidden">
        {rows.map((artist, index) => (
          <div className="flex items-start gap-3 border-b-[1px] border-[#FFFFFF33] px-[12px] py-[16px]">
            {/* Rank */}
            <div className="flex flex-col shrink-0">
              {/* <span className="text-gray-500 text-sm">#</span> */}

              <span
                className={`w-10 h-10 flex items-center justify-center text-lg font-bold ${
                  artist.ranks === 1
                    ? "bg-[#EAB54F] text-black"
                    : artist.ranks === 2
                      ? "bg-emerald-400 text-black"
                      : artist.ranks === 3
                        ? "bg-cyan-400 text-black"
                        : "bg-[#1a1a2e] text-white border border-gray-600"
                }`}
              >
                {String(artist.ranks).padStart(2, "0")}
              </span>
            </div>

            {/* Profile image */}

            {/* Content */}
            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
              {/* Left column */}

              <div>
                <img
                  src={`${artist.personal_photo}?height=60&width=60`}
                  alt={artist.stage_name}
                  className="w-[60px] h-[60px] rounded-full object-cover shrink-0 mb-[8px]"
                />
                <p className="text-gray-500 uppercase">Location</p>
                <p className="text-white font-bold text-lg">
                  {artist.location ?? "—"}
                </p>

                <div className="mt-4">
                  <p className="text-gray-500 uppercase">Reach</p>
                  <p className="text-white font-bold text-lg">
                    {formatReach(
                      artist.total_views ??
                        artist.Total_views ??
                        artist.totalViews,
                    )}
                  </p>
                </div>
              </div>

              {/* Right column */}
              <div>
                <p className="text-gray-500 uppercase">Stage Name</p>
                <p className="text-white font-bold text-lg truncate">
                  {artist.stage_name}
                </p>

                <div className="mt-4">
                  <p className="text-gray-500 uppercase">Songs</p>
                  <p className="text-white font-bold text-lg">
                    {artist.song_count ?? "—"}
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-[16px] px-6 py-3 rounded-full bg-[#7C55C7] text-white font-medium shadow-[0_0_25px_rgba(124,85,199,0.5)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    const oid = resolveLeaderboardOphId(artist);
                    if (!oid) return;
                    goToArtistProfile(oid);
                  }}
                >
                  View Profile
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-[100%] border-separate border-spacing-y-2">
          <thead>
            <tr className="text-center text-gray-400 rounded-2xl border-gray-800">
              <th className="py-2 px-4">#</th>
              <th className="py-2 px-4">ARTIST</th>
              <th className="py-2 px-4">STAGE NAME</th>
              <th className="py-2 px-4">LOCATION</th>
              <th className="py-2 px-4">SONGS</th>
              <th className="py-2 px-4">REACH</th>
              <th className="py-2 px-4">PROFILE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((artist, index) => (
              <tr
                role="button"
                tabIndex={0}
                onClick={() =>
                  goToArtistProfile(resolveLeaderboardOphId(artist))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    goToArtistProfile(resolveLeaderboardOphId(artist));
                  }
                }}
                key={`${resolveLeaderboardOphId(artist) || "row"}-${index}`}
                className={`cursor-pointer rounded-2xl text-center border-gray-800 overflow-hidden ${
                  artist.OPH_ID == artistId ? "bg-[#6F4aA0]" : ""
                }`}
              >
                <td className="px-4 py-2">
                  <span
                    className={`w-8 h-8 flex items-center justify-center text-md font-bold text-black ${
                      artist.ranks === 1
                        ? "bg-yellow-400"
                        : artist.ranks === 2
                          ? "bg-emerald-400"
                          : artist.ranks === 3
                            ? "bg-cyan-400"
                            : "bg-transparent text-white"
                    }`}
                  >
                    {String(artist.ranks).padStart(2, "0")}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <img
                    src={`${artist.personal_photo}?height=40&width=40`}
                    alt={artist.stage_name}
                    className="w-8 h-8 rounded-full mx-auto"
                  />
                </td>
                <td className="py-2 px-4">{artist.stage_name}</td>
                <td className="py-2 px-4">{artist.location}</td>
                <td className="py-2 px-4">{artist.song_count}</td>
                <td className="py-2 px-4">
                  {formatReach(
                    artist.total_views ??
                      artist.Total_views ??
                      artist.totalViews,
                  )}
                </td>
                <td className="py-2 px-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-[#6F4fca] rounded-full text-sm hover:bg-[#6F4FA0] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const oid = resolveLeaderboardOphId(artist);
                      if (!oid) return;
                      goToArtistProfile(oid);
                    }}
                  >
                    View Profile
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const SongDuration = ({ url, className = "", as: As = "span" }) => {
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!url || typeof url !== "string" || !url.trim()) {
      setDuration(null);
      return;
    }

    const audio = new Audio(url.trim());
    const onMeta = () => {
      setDuration(
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : null,
      );
    };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", () => setDuration(null));

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const text =
    !url || (typeof url === "string" && !url.trim())
      ? "—"
      : duration != null
        ? formatTime(duration)
        : "…";

  return <As className={className}>{text}</As>;
};

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
};

function Songs() {
  /* Previous song rankings tables + audio — restore from git if needed:
   * get-songs-rankings-by-id, artistSongs state, handlePlayPause, two <table> blocks
   * ("Current Song" card + "Other Songs" section).
   */
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
        <div className="flex min-h-[200px] sm:min-h-[260px] items-center justify-center px-4 flex-col p-8 gap-5">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="#5dc9de"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 1C9.24 1 7 3.24 7 6V9H6C4.9 9 4 9.9 4 11V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V11C20 9.9 19.1 9 18 9H17V6C17 3.24 14.76 1 12 1ZM9 6C9 4.34 10.34 3 12 3C13.66 3 15 4.34 15 6V9H9V6ZM12 17C10.9 17 10 16.1 10 15C10 13.9 10.9 13 12 13C13.1 13 14 13.9 14 15C14 16.1 13.1 17 12 17Z" />
          </svg>
          <h2 className="text-center text-3xl font-bold tracking-tight text-cyan-400 sm:text-5xl md:text-6xl lg:text-7xl uppercase">
            Coming soon
          </h2>
        </div>
      </div>
    </div>
  );
}

export default function ArtistSpotlight() {
  const [activeTab, setActiveTab] = useState("leaderboard");
  const leaderboard = useSelector((state) => state.newRelease.leaderboard);

  console.log(leaderboard);

  const [artist_id, setArtistID] = useState(null);
  const [songsById, setSongsById] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [artist, setArtist] = useState([]);
  const { headers, ophid } = useArtist();

  const [notes, setNotes] = useState(ARTIST_SPOTLIGHT_EMPTY_NOTE);

  const applyNoteFromRow = (row) => {
    if (!row) {
      setNotes(ARTIST_SPOTLIGHT_EMPTY_NOTE);
      return;
    }
    const raw = row.Notes ?? row.notes ?? row.NOTE ?? row.note ?? null;
    const text =
      raw == null || raw === "null" || String(raw).trim() === ""
        ? ARTIST_SPOTLIGHT_EMPTY_NOTE
        : String(raw);
    setNotes(text);
  };

  const [professions, setProfessions] = useState([]);

  // Fetch professions from API
  const fetchProfessions = async () => {
    try {
      const response = await axiosApi.get("/get_professions");
      if (response.data && response.data.success) {
        setProfessions(response.data.data || []);
      } else {
        console.error("Failed to fetch professions:", response.data?.message);
      }
    } catch (error) {
      console.error("Error fetching professions:", error);
    }
  };

  useEffect(() => {
    fetchProfessions();
  }, []);

  const fetchArtistSpotlight = async () => {
    setIsLoading(true);
    try {
      if (!headers || !headers.Authorization) {
        console.warn("Headers not ready yet");
        return;
      }
      const response = await axiosApi.get("/artist-spotlight/artist-info", {
        headers: headers,
        params: { ophid },
      });
      if (response.data.success) {
        const row = response.data.data[0];
        setArtist(row);
        setArtistID(row.oph_id);
        applyNoteFromRow(row);
        setIsLoading(false);
      }
    } catch (err) {
      setError("Failed to Load Artist Spotlight");
      console.log(err);
    } finally {
      setIsLoading(false);
    }
  };

  function formatProfessionLabel(raw) {
    if (raw == null || String(raw).trim() === "") return "—";
    const s = String(raw).trim();
    if (/^\d+$/.test(s)) {
      const id = parseInt(s, 10);
      const prof = professions.find((pf) => pf.id === id);
      return prof?.name ?? s;
    }
    return s;
  }

  const getArtistRank = () => {
    if (!leaderboard || !Array.isArray(leaderboard)) return null;
    const myId = String(artist?.oph_id ?? ophid ?? "").trim();
    if (!myId) return null;

    const found = leaderboard.find((entry) => {
      const eid = resolveLeaderboardOphId(entry);
      return eid === myId;
    });

    if (!found) return null;
    const raw = found.ranks ?? found.rank;
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    if (ophid) {
      fetchArtistSpotlight();
    }
  }, [ophid]);
  return (
    <>
      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-12 w-12 rounded-2xl-2 border-cyan-400 mx-auto"></div>
          <p className="mt-2 text-cyan-400">Loading Artist Spotlight...</p>
        </div>
      )}
      {error && (
        <div className="text-center py-4 text-red-400">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-500/20 rounded hover:bg-red-500/30"
          >
            Try Again
          </button>
        </div>
      )}
      {!isLoading && !error && (
        <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:p-6">
          <div className="max-w-8xl mx-auto space-y-8">
            {/* Artist Header */}
            <div className="flex justify-between flex-col lg:flex-row mb-8">
              <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
                <NavbarLeft />
                <NavbarRight />
              </div>
              <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
                ARTIST SPOTLIGHT
              </h2>
              <div className="hidden lg:block">
                <NavbarRight />
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 px-6 lg:flex-row lg:justify-start">
              {/* Artist Image with Rank Badge */}
              <div className="relative">
                <img
                  src={artist.personal_photo}
                  alt={artist.stage_name}
                  className="w-32 h-32 rounded-full border-[6px] border-[#5DC9DE] object-cover shadow-[0_0_20px_#5DC9DE]"
                />

                {/* Rank Badge */}
                {(() => {
                  const rank = getArtistRank();

                  // Common purple style
                  const rankBgClass =
                    "bg-[#6F4FA0] text-white ring-1 ring-[#6F4FA0]";

                  if (rank == null) {
                    return (
                      <span
                        className={`absolute bottom-0 right-0 min-w-9 px-1.5 py-1 rounded-full transform -rotate-12 flex items-center justify-center text-xs lg:text-sm font-medium tabular-nums ${rankBgClass}`}
                        title="Not on the community leaderboard yet. Rankings are for artists who appear on the public leaderboard."
                        aria-label="Not on the community leaderboard"
                      >
                        –
                      </span>
                    );
                  }

                  return (
                    <span
                      className={`absolute bottom-0 right-0 min-w-9 px-1.5 py-1 rounded-full transform -rotate-12 flex items-center justify-center text-xs lg:text-sm font-bold tabular-nums ${rankBgClass}`}
                      title={`Community leaderboard rank #${rank}`}
                      aria-label={`Leaderboard rank ${rank}`}
                    >
                      {rank}
                    </span>
                  );
                })()}
              </div>

              {/* Artist Info */}
              <div className="text-center lg:text-left">
                <h2 className="text-3xl sm:text-[45px] font-bold mb-[12px] text-[#5DC9DE] lg:text-white ">
                  {artist.full_name}
                </h2>
                <p className="text-gray-400">
                  Stage Name:{" "}
                  <span className="text-[#5DC9DE]">{artist.stage_name}</span>
                </p>
                <p className="text-gray-400 mt-1">
                  Profession:{" "}
                  {formatProfessionLabel(
                    artist.Profession ?? artist.profession,
                  )}
                </p>
              </div>
            </div>

            <div className="px-6 text-center lg:text-left">
              <p className="text-gray-500">{artist.Bio}</p>
            </div>

            {/* Tab Buttons */}
            <div className="flex flex-col lg:flex-row justify-between sm:px-3 items-start lg:items-center gap-[12px]">
              <h1 className="text-cyan-400 text-3xl lg:text-xl font-extrabold mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,1)] lg:px-0 lg:py-0 pt-6 uppercase">
                {activeTab}
              </h1>
              <div className="w-full lg:w-[unset] flex lg:px-0 gap-4">
                <button
                  className={`pb-1 hover:text-cyan-400 w-full ${
                    activeTab === "leaderboard"
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("leaderboard")}
                >
                  ARTISTS
                </button>
                <button
                  className={`pb-1 hover:text-cyan-400 w-full ${
                    activeTab === "songs"
                      ? "text-cyan-400 border-b-2 border-cyan-400"
                      : "text-gray-400"
                  }`}
                  onClick={() => setActiveTab("songs")}
                >
                  SONGS
                </button>
              </div>
            </div>

            {/* Render Active Tab */}
            {activeTab === "leaderboard" ? (
              <Leaderboard
                leaderboardData={leaderboard}
                artistId={artist.oph_id}
              />
            ) : (
              <Songs />
            )}

            {/* Note Section */}
            {activeTab === "leaderboard" && (
              <div className="space-y-4 lg:px-0 px-6">
                <h3 className="text-xl font-semibold text-cyan-400">
                  Note: Want to Improve the Rankings? Here’s How -
                </h3>
                <p className="text-gray-500 whitespace-pre-line">{notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
