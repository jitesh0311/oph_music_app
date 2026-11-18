import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosApi from "../../conf/axios";
import getToken from "../../utils/getToken";
import { useArtist } from "../auth/API/ArtistContext";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

export default function UploadSongs() {
  const navigate = useNavigate();
  const [pendingContent, setPendingContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { ophid, headers } = useArtist();

  useEffect(() => {
    setError(null);

    const fetchPendingContent = async () => {
      try {
        const response = await axiosApi.get("/pending-song-registeration", {
          headers: headers,
          params: { ophid },
        });

        if (response.data.success) {
          setPendingContent(response.data.data || {});
        } else {
          setPendingContent({});
        }
      } catch (err) {
        console.error("Error fetching pending content:", err);
        const message =
          err.response?.status === 401
            ? "Please log in again."
            : err.response?.data?.message || "Failed to load pending content";
        setError(message);
        setPendingContent({});
      } finally {
        setIsLoading(false);
      }
    };

    if (ophid && headers?.Authorization) {
      fetchPendingContent();
    } else {
      setIsLoading(false);
    }
  }, [ophid, headers]);

  // Resolve first step: audio -> video -> payment.
  // Date Booking payment rejected → /auth/payment (repay for date). Song Reg payment → video (Pay now).
  const getFirstRejectedPage = (rejectedSections) => {
    if (!rejectedSections?.length)
      return "/dashboard/upload-song/audio-metadata/";
    const hasAudio = rejectedSections.some((s) => s.section === "audio");
    const hasVideo = rejectedSections.some((s) => s.section === "video");
    const paymentSection = rejectedSections.find(
      (s) => s.section === "payment",
    );
    const hasPayment = !!paymentSection;
    const isDateBookingPayment = paymentSection?.isDateBooking === true;
    const hasRejectedPaymentDetails =
      paymentSection?.rejectedPayments?.length > 0;
    if (hasAudio) return "/dashboard/upload-song/audio-metadata/";
    if (hasVideo) return "/dashboard/upload-song/video-metadata/";
    // Date Booking or paid-in-advance+lyrical (one or both rejected) → payment page
    if (hasPayment && (isDateBookingPayment || hasRejectedPaymentDetails))
      return "/auth/payment";
    if (hasPayment) return "/dashboard/upload-song/video-metadata/"; // Song Reg → video (Pay now)
    return "/dashboard/upload-song/audio-metadata/";
  };

  // Draft (pending): same UX as song-reg "payment rejected" — open video metadata with Pay now, not standalone /auth/payment.
  // Still send users to /auth/payment for date-booking repayment or date+lyrical both rejected.
  const normalizeSongStatus = (status) => {
    const raw = (status ?? "").toString().toLowerCase().trim();
    if (!raw || raw === "draft") return "pending";
    if (raw === "pending") return "pending";
    if (raw === "under review") return "under review";
    if (raw === "rejected") return "rejected";
    if (raw === "approved") return "approved";
    if (raw === "published") return "Published";
    return (status ?? "").toString().trim();
  };

  const isDraftLikeStatus = (status) => {
    const raw = (status ?? "").toString().toLowerCase().trim();
    return !raw || raw === "draft" || raw === "pending";
  };

  const resolveNextPageForDraft = (song, rawNext) => {
    if (!isDraftLikeStatus(song.status) || rawNext !== "/auth/payment") {
      return { next_page: rawNext, resumeVideoPayNow: false };
    }
    const rejectedSections = song.rejectedSections || [];
    const paymentSection = rejectedSections.find(
      (s) => s.section === "payment",
    );
    const isDateBooking = paymentSection?.isDateBooking === true;
    const rp = paymentSection?.rejectedPayments || [];
    const bothRejected = rp.length >= 2;
    if (isDateBooking || bothRejected) {
      return { next_page: rawNext, resumeVideoPayNow: false };
    }
    return {
      next_page: "/dashboard/upload-song/video-metadata/",
      resumeVideoPayNow: true,
    };
  };

  // Get the most recently updated pending content
  // pendingContent is an object with song_id as keys, convert to array
  const submittedSongs =
    pendingContent &&
    typeof pendingContent === "object" &&
    Object.keys(pendingContent).length > 0
      ? Object.values(pendingContent).map((song, rowIndex) => {
          const rejectedSections = song.rejectedSections || [];
          const rawNext =
            rejectedSections.length > 0
              ? getFirstRejectedPage(rejectedSections)
              : song.next_page || "/dashboard/upload-song/audio-metadata/";
          const { next_page, resumeVideoPayNow } = resolveNextPageForDraft(
            song,
            rawNext,
          );
          return {
            name: song.Song_name,
            status: normalizeSongStatus(song.status),
            id: song.song_id,
            rowIndex,
            reject_reason: song.reject_reason,
            next_page,
            resumeVideoPayNow,
            projectType: song.projectType,
            release_date: song.release_date,
            lyrical_services: song.lyrical_services,
            firstRejectedStep: song.firstRejectedStep,
            rejectedSections,
          };
        })
      : [];

  const handleProjectClick = (projectType) => {
    localStorage.setItem("projectType", projectType);
    // Navigate to the appropriate project type page
    navigate("/dashboard/upload-song/register-song", {
      state: {
        projectType,
      },
    });
  };

  // Get status color based on status
  const getStatusColor = (status) => {
    const colorMap = {
      pending: "text-yellow-400 border-yellow-400/30",
      "under review": "text-cyan-400 border-cyan-400/30",
      rejected: "text-red-400 border-red-400/30",
      approved: "text-green-400 border-green-400/30",
      Published: "text-green-400 border-green-400/30",
    };
    return colorMap[status] || "text-gray-400 border-gray-400/30";
  };

  // Display label for status (capitalised for UI)
  const getStatusLabel = (status) => {
    const labelMap = {
      pending: "Draft",
      "under review": "Under Review",
      approved: "Approved",
      rejected: "Rejected",
    };
    return labelMap[status] ?? status;
  };

  return (
    <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:px-8 lg:p-6">
      <div className="w-full space-y-8">
        <div className="flex flex-col lg:flex-row justify-between mb-8">
          <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
            <NavbarLeft />
            <NavbarRight />
          </div>
          <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
            UPLOAD SONGS
          </h2>
          <div className="hidden lg:block">
            <NavbarRight />
          </div>
        </div>
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <p className="text-gray-400">Loading...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-4 space-y-2">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                if (ophid && headers?.Authorization) {
                  axiosApi
                    .get("/pending-song-registeration", {
                      headers,
                      params: { ophid },
                    })
                    .then((res) => {
                      if (res.data.success)
                        setPendingContent(res.data.data || {});
                      else setPendingContent({});
                    })
                    .catch((err) => {
                      console.error("Retry failed:", err);
                      setError(
                        err.response?.data?.message ||
                          "Failed to load pending content",
                      );
                      setPendingContent({});
                    })
                    .finally(() => setIsLoading(false));
                } else setIsLoading(false);
              }}
              className="px-4 py-2 rounded-full border border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 pt-4 max-w-2xl">
          <button
            onClick={() => handleProjectClick("new project")}
            className="w-full px-6 py-3 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-colors"
          >
            REGISTER YOUR NEW SONG
          </button>

          <button
            onClick={() => handleProjectClick("hybrid project")}
            className="w-full px-6 py-3 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-colors"
          >
            REGISTER YOUR HYBRID SONG
          </button>

          <button
            onClick={() => handleProjectClick("paid in advance")}
            className="w-full px-6 py-3 rounded-full border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 transition-colors"
          >
            Paid in Advance
          </button>
        </div>
        <h1 className="text-cyan-400 text-xl font-extrabold mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
          YOUR SONGS STATUS
        </h1>

        {/* Submitted Song Section */}
        {submittedSongs.length > 0 ? (
          submittedSongs.map((song) => (
            <div
              key={`song-${song.id != null ? song.id : "noid"}-${song.rowIndex}`}
              className="relative z-[1] bg-gray-800/50 rounded-lg p-4 cursor-pointer max-w-2xl"
              onClick={async (e) => {
                const st = (song.status ?? "").toString().toLowerCase().trim();
                if (isDraftLikeStatus(song.status) || st === "rejected") {
                  const paymentSection = song.rejectedSections?.find(
                    (s) => s.section === "payment",
                  );
                  const isDateBookingPaymentRejected =
                    paymentSection?.isDateBooking === true;
                  const paymentRepayAmount = paymentSection?.paymentRepayAmount;
                  const rejectedPayments = paymentSection?.rejectedPayments;
                  const bothRejected = rejectedPayments?.length >= 2;
                  const isPaymentRepayment =
                    paymentSection && st === "rejected";
                  const rs = song.rejectedSections || [];
                  const paymentOnlyResume =
                    rs.some((s) => s.section === "payment") &&
                    !rs.some(
                      (s) => s.section === "video" || s.section === "audio",
                    );
                  let state = {
                    song_id: song.id,
                    songName: song.name,
                    release_date: song.release_date,
                    project_type: song.projectType,
                    lyrical_services: song.lyrical_services,
                    isFixingRejected: st === "rejected",
                    rejectedSections: song.rejectedSections,
                    ...((song.resumeVideoPayNow || paymentOnlyResume) && {
                      showPayNowOnVideo: true,
                    }),
                    ...(isPaymentRepayment &&
                      paymentRepayAmount != null && {
                        amount: paymentRepayAmount,
                        paymentRepayAmount,
                        rejectedPayments,
                      }),
                    // Both Date Booking + lyrical rejected: use Date booking (triggers /booking), amount=1198
                    ...(isPaymentRepayment &&
                      bothRejected && {
                        from: "Date booking",
                        booking_date: song.release_date,
                        date: song.release_date,
                      }),
                    // Date Booking only repayment
                    ...(isPaymentRepayment &&
                      !bothRejected &&
                      isDateBookingPaymentRejected && {
                        from: "Date booking",
                        booking_date: song.release_date,
                        date: song.release_date,
                      }),
                    // Lyrical-only repayment (paid-in-advance + lyrical)
                    ...(isPaymentRepayment &&
                      !bothRejected &&
                      !isDateBookingPaymentRejected &&
                      rejectedPayments?.length > 0 && {
                        from: "Song Repayment",
                      }),
                  };

                  // Draft / pending can still resume at /auth/payment (next_page from API). Without `from`,
                  // PaymentScreen falls back to member "registration" pricing (wrong amount, e.g. ₹2999).
                  if (song.next_page === "/auth/payment" && !state.from) {
                    if (bothRejected || isDateBookingPaymentRejected) {
                      state = {
                        ...state,
                        from: "Date booking",
                        booking_date: song.release_date,
                        date: song.release_date,
                      };
                    } else if (rejectedPayments?.length > 0) {
                      state = { ...state, from: "Song Repayment" };
                    } else {
                      state = {
                        ...state,
                        from: "Song Registration",
                        backPath: "/dashboard/upload-song",
                      };
                    }
                  }
                  // For draft (pending): check if release date is still free on calendar (non-blocking on failure/timeout)
                  const hasSongId = song.id != null && song.id !== "";
                  if (
                    isDraftLikeStatus(song.status) &&
                    song.release_date &&
                    hasSongId
                  ) {
                    try {
                      const res = await axiosApi.get(
                        "/check-release-date-available",
                        {
                          headers,
                          params: {
                            release_date: song.release_date,
                            song_id: song.id,
                            ophid,
                          },
                          timeout: 6_000,
                        },
                      );
                      if (res.data.success && res.data.available === false) {
                        navigate("/dashboard/upload-song/register-song", {
                          state: {
                            ...state,
                            dateNoLongerAvailable: true,
                            returnToPage: song.next_page,
                          },
                        });
                        localStorage.setItem("projectType", song.projectType);
                        return;
                      }
                    } catch (err) {
                      console.error("Check release date:", err);
                    }
                  }
                  const path =
                    song.next_page && String(song.next_page).trim()
                      ? String(song.next_page).trim()
                      : "/dashboard/upload-song/audio-metadata/";
                  navigate(path, { state });
                  localStorage.setItem("projectType", song.projectType);
                } else {
                  e.preventDefault();
                }
              }}
            >
              <div className="flex justify-between items-center">
                <div className="">
                  <p className="text-sm text-gray-400">Submitted Song:</p>
                  <p className="text-lg">{song.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-4 py-1 rounded-full text-sm border ${getStatusColor(song.status)}`}
                  >
                    {getStatusLabel(song.status)}
                  </span>
                </div>
              </div>
              {/* Show all rejected sections clearly: Audio Rejected, Video Rejected, Payment Rejected */}
              {song.status === "rejected" &&
                song.rejectedSections?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {song.rejectedSections.map((s) => (
                      <p key={s.section} className="text-red-400 text-sm">
                        {s.label}
                        {s.reason ? ` — ${s.reason}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              {song.status === "rejected" &&
                (!song.rejectedSections ||
                  song.rejectedSections.length === 0) &&
                song.firstRejectedStep && (
                  <p className="text-red-400 mt-2">{song.firstRejectedStep}</p>
                )}
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-400">
              No songs found. Start by creating a new project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
