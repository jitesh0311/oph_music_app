import React, { useState, useEffect, useRef } from "react";
import { Camera, Plus, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axiosApi from "../../../conf/axios";
import { uploadVideoViaPresignedPut } from "../../../utils/presignedVideoUpload";
import { useArtist } from "../../auth/API/ArtistContext";
import Loading from "../../../components/Loading";
import { toast, ToastContainer } from "react-toastify";
import CustomVideoPlayer from "../../../components/CustomVideoPlayer/CustomVideoPlayer";
import { socket } from "../../../../hook/socket";
import NavbarRight from "../../../components/Navbar/NavbarRight";
import NavbarLeft from "../../../components/Navbar/NavbarLeft";

export default function VideoMetadataForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payStat, setPayStat] = useState("");

  console.log(location);

  // Get song_id from location state (e.g. from upload flow or when returning from payment cancel)
  const contentId = location.state?.song_id;

  const [nextPage, setNextPage] = useState("");
  const releaseDateRaw =
    location.state?.release_date ?? location.state?.booking_date;
  const formattedDate = (() => {
    if (!releaseDateRaw) return "";
    const s = String(releaseDateRaw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const release_date = new Date(releaseDateRaw).toLocaleDateString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    if (!release_date || !release_date.includes("/")) return "";
    const parts = release_date.split("/");
    if (parts.length < 3) return "";
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  })();
  const release_date = releaseDateRaw
    ? new Date(releaseDateRaw).toLocaleDateString("en-GB", {
        timeZone: "Asia/Kolkata",
      })
    : "";

  const [songName, setSongName] = useState(location.state?.songName || "");
  // Prefer location.state (from navigation) so "Paid in Advance" from backend works; fallback to localStorage
  const projectTypeRaw =
    location.state?.project_type || localStorage.getItem("projectType") || "";
  const projectType =
    typeof projectTypeRaw === "string" ? projectTypeRaw.trim() : "";
  const isPaidInAdvance =
    projectType.length > 0 &&
    String(projectType).toLowerCase().includes("paid in advance");
  const lyricalServices =
    location.state?.lyrical_services === true ||
    location.state?.lyrical_services === "true" ||
    location.state?.lyrical_services === 1 ||
    location.state?.lyrical_services === "1";
  const { headers, ophid } = useArtist();
  const [formData, setFormData] = useState({
    credits: "",
    thumbnails: [],
    video_file: null,
    existing_thumbnails: [],
    existing_video_url: null,
    reject_reason: null,
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPaidForLyricalVideo, setHasPaidForLyricalVideo] = useState(false); // Add state for lyrical video payment

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState({
    percentage: 0,
    loadedMB: 0,
    totalMB: 0,
    speed: 0,
    time: 0,
    isUploading: false,
  });

  const [checkBookingDates, setCheckBookingDates] = useState([]);
  const [navigateToSongReg, setNavigateToSongReg] = useState(false);
  const [videoMetadataLoaded, setVideoMetadataLoaded] = useState(false);
  const [paymentCheckDone, setPaymentCheckDone] = useState(false);
  const [showPayNowAfterSubmit, setShowPayNowAfterSubmit] = useState(false);
  const progressCleanupRef = useRef(null);

  const rejectedSectionsNav = location.state?.rejectedSections;
  const paymentOnlyRejectedFromNav =
    Array.isArray(rejectedSectionsNav) &&
    rejectedSectionsNav.some((s) => s.section === "payment") &&
    !rejectedSectionsNav.some(
      (s) => s.section === "video" || s.section === "audio",
    );

  // Video is in rejected list (from status page) = user must submit video changes first
  const isVideoRejected = rejectedSectionsNav?.some(
    (s) => s.section === "video",
  );
  // Paid in advance without lyrical: never show Pay now (no payment needed)
  const isPaidInAdvanceNoLyricalCheck = isPaidInAdvance && !lyricalServices;
  const paymentStillNeedsCompletion =
    nextPage === "repayment" || nextPage === "payment";
  // Only payment rejected = pay again; video/audio not in rejected list from dashboard (or stale video reject_reason in DB)
  const onlyPaymentRejected =
    !isPaidInAdvanceNoLyricalCheck &&
    videoMetadataLoaded &&
    paymentCheckDone &&
    paymentStillNeedsCompletion &&
    !!formData.existing_video_url &&
    (paymentOnlyRejectedFromNav ||
      (!isVideoRejected && formData.reject_reason == null));
  // After audio resubmit when both audio and payment were rejected: land here with read-only + Pay now
  const showPayNowOnVideoFromState =
    location.state?.showPayNowOnVideo === true &&
    !isPaidInAdvanceNoLyricalCheck;
  // Show read-only + Pay now when: (1) video already submitted and only payment left, (2) user just submitted on this page, or (3) came from audio resubmit (audio+payment rejected)
  // Never show for paid in advance without lyrical
  const showReadOnlyAndPayNow =
    !isPaidInAdvanceNoLyricalCheck &&
    (onlyPaymentRejected ||
      showPayNowAfterSubmit ||
      (showPayNowOnVideoFromState &&
        videoMetadataLoaded &&
        !!formData.existing_video_url));

  const urlToFile = async (url, fileName, mimeType) => {
    try {
      if (!url || typeof url !== "string") {
        throw new Error("Invalid URL provided");
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      const buffer = await res.blob();
      return new File([buffer], fileName, { type: mimeType });
    } catch (error) {
      console.error(`Error converting URL to file (${url}):`, error);
      // Return null instead of throwing to prevent breaking the component
      return null;
    }
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (formData.thumbnails.length + files.length > 3) {
      toast.error("Maximum 3 thumbnails allowed");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      thumbnails: [...prev.thumbnails, ...files].slice(0, 3),
    }));
  };

  const removePhoto = (index) => {
    setFormData((prev) => ({
      ...prev,
      thumbnails: prev.thumbnails.filter((_, i) => i !== index),
    }));
  };

  const removeExistingPhoto = async (index) => {
    try {
      setIsRemoving(true);
      setFormData((prev) => ({
        ...prev,
        existing_thumbnails: prev.existing_thumbnails.filter(
          (_, i) => i !== index,
        ),
      }));
    } catch (error) {
      console.error("Error removing photo:", error);
      toast.error("Failed to remove photo");
    } finally {
      setIsRemoving(false);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        video_file: file,
      }));
    }
  };

  const checkPaymentStaus = async () => {
    try {
      const response = await axiosApi.get("/check-payment-status", {
        headers: headers,
        params: { contentId, ophid },
      });

      if (response.data.success) {
        const nextPagePath = response.data.data?.nextPagePath;
        const rejectReason = response.data.data?.reject_reason;

        setNextPage(nextPagePath || "");
        setPayStat(rejectReason || "");
      }
    } catch (err) {
      console.error("Error checking payment status:", err);
    } finally {
      setPaymentCheckDone(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!contentId) {
      toast.error(
        "Missing song information. Please go back and open this step from the upload flow again.",
      );
      return;
    }

    if (showReadOnlyAndPayNow) {
      toast.info("Use Pay now to complete payment. No need to resubmit video.");
      return;
    }

    if (
      formData.thumbnails.length === 0 &&
      formData.existing_thumbnails.length === 0
    ) {
      toast.error("At least one thumbnail is required");
      return;
    }

    if (
      !location.state.lyrical_services &&
      !hasPaidForLyricalVideo &&
      !formData.video_file &&
      !formData.existing_video_url
    ) {
      toast.error("Video file is required");
      return;
    }

    const storedToken = localStorage.getItem("token");
    if (!storedToken || storedToken === "undefined" || storedToken === "null") {
      toast.error("Please sign in again to upload your video.");
      return;
    }

    /**
     * Always PUT new video files to S3 via presigned URL, then POST only metadata + thumbnails.
     * Large multipart POSTs to the API often never reach Node behind Cloudflare (typical ~100MB cap).
     */
    try {
      setIsSubmitting(true);
      setIsLoading(true);

      let directS3VideoUrl = null;
      if (formData.video_file) {
        const putStart = Date.now();
        try {
          directS3VideoUrl = await uploadVideoViaPresignedPut(
            axiosApi,
            formData.video_file,
            {
              purpose: "song-video",
              headers,
              params: { song_id: contentId },
              onUploadProgress: (ev) => {
                if (!ev.total) return;
                const loadedMB = ev.loaded / (1024 * 1024);
                const totalMB = ev.total / (1024 * 1024);
                const pct = Math.round((ev.loaded / ev.total) * 100);
                const elapsed = (Date.now() - putStart) / 1000;
                const speed = loadedMB / (elapsed || 1);
                setUploadProgress({
                  percentage: pct,
                  loadedMB,
                  totalMB,
                  speed,
                  time: elapsed,
                  isUploading: true,
                });
              },
              onSocketProgress: (data) => {
                if (socket?.connected && ophid) {
                  socket.emit("presigned-video-upload-progress", {
                    ophid: String(ophid).trim(),
                    song_id: contentId,
                    ...data,
                  });
                }
              },
            },
          );
        } catch (putErr) {
          toast.error(putErr.message || "Video upload to storage failed.");
          throw putErr;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append("song_id", contentId);
      formDataToSend.append("ophid", ophid);
      formDataToSend.append("credits", formData.credits);

      // Send existing thumbnails as JSON (URLs that are already on S3)
      if (
        formData.existing_thumbnails &&
        formData.existing_thumbnails.length > 0
      ) {
        formDataToSend.append(
          "existing_thumbnails",
          JSON.stringify(formData.existing_thumbnails),
        );
      }

      if (directS3VideoUrl) {
        formDataToSend.append("existing_video_url", directS3VideoUrl);
      } else if (formData.existing_video_url) {
        // Preserve existing S3 URL when user resubmits without choosing a new file
        formDataToSend.append(
          "existing_video_url",
          formData.existing_video_url,
        );
      }

      // Only send NEW thumbnails (File objects), not existing ones that were converted from URLs
      // Filter out thumbnails that are actually existing ones (check if they have a name that matches existing URLs)
      const newThumbnails = formData.thumbnails.filter((thumbnail) => {
        // If thumbnail is a File object (has .name and .size), it's a new upload
        // If it was converted from URL, it might not have proper File properties
        // Check if it's actually a new file by seeing if it exists in existing_thumbnails
        if (thumbnail instanceof File) {
          const isExisting = formData.existing_thumbnails?.some(
            (existingUrl) => {
              const existingFileName = existingUrl.split("/").pop();
              return thumbnail.name === existingFileName;
            },
          );
          return !isExisting; // Only include if it's NOT an existing thumbnail
        }
        return true; // Include if it's not a File (shouldn't happen, but be safe)
      });

      newThumbnails.forEach((thumbnail) => {
        formDataToSend.append("thumbnails", thumbnail);
      });

      console.log(
        `[Frontend] Sending ${newThumbnails.length} new thumbnail(s) and ${formData.existing_thumbnails?.length || 0} existing thumbnail URL(s)`,
      );

      // Calculate total file size for progress tracking (multipart leg only after direct S3 video)
      let totalSize = 0;
      if (formData.video_file && !directS3VideoUrl) {
        totalSize += formData.video_file.size;
      }
      newThumbnails.forEach((thumb) => {
        if (thumb instanceof File) {
          totalSize += thumb.size;
        }
      });

      const startTime = Date.now();
      const totalMBInitial = directS3VideoUrl
        ? totalSize
          ? (totalSize / (1024 * 1024)).toFixed(2)
          : "0"
        : formData.video_file
          ? (formData.video_file.size / (1024 * 1024)).toFixed(2)
          : totalSize
            ? (totalSize / (1024 * 1024)).toFixed(2)
            : "0";
      if (!directS3VideoUrl) {
        setUploadProgress({
          percentage: 0,
          loadedMB: 0,
          totalMB: parseFloat(totalMBInitial),
          speed: 0,
          time: 0,
          isUploading: true,
        });
      } else {
        setUploadProgress((prev) => ({
          ...prev,
          totalMB: parseFloat(totalMBInitial) || prev.totalMB,
          isUploading: true,
        }));
      }

      // Real S3 progress from backend via socket (matches backend logs)
      if (formData.video_file && !directS3VideoUrl && socket) {
        const handler = (data) => {
          setUploadProgress((prev) => ({
            ...prev,
            percentage: data.percent ?? prev.percentage,
            loadedMB: data.loadedMB ?? prev.loadedMB,
            totalMB: data.totalMB ?? prev.totalMB,
            speed: data.speed ?? prev.speed,
            time: data.time ?? prev.time,
            isUploading: true,
          }));
        };
        socket.on("video-upload-progress", handler);
        progressCleanupRef.current = () =>
          socket.off("video-upload-progress", handler);
      }

      // Do not set Content-Type — browser/axios must add multipart boundary.
      // Auth: axios interceptor adds Authorization from localStorage if header missing.
      const response = await axiosApi.post(`/video-details`, formDataToSend, {
        timeout: 0, // large video: browser→server multer + server→S3 can exceed any fixed limit
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          // Video in multipart: progress from socket. Direct S3 video: use this for thumbnails leg only.
          if (formData.video_file && !directS3VideoUrl) return;
          if (progressEvent.total) {
            const loaded = progressEvent.loaded;
            const total = progressEvent.total;
            const percentage = Math.round((loaded / total) * 100);
            const loadedMB = (loaded / (1024 * 1024)).toFixed(2);
            const totalMB = (total / (1024 * 1024)).toFixed(2);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const speed =
              elapsed > 0
                ? (loaded / (1024 * 1024) / parseFloat(elapsed)).toFixed(2)
                : 0;
            setUploadProgress((prev) => ({
              ...prev,
              percentage,
              loadedMB: parseFloat(loadedMB),
              totalMB: parseFloat(totalMB),
              speed: parseFloat(speed),
              time: parseFloat(elapsed),
              isUploading: true,
            }));
          }
        },
      });

      // Paid in advance + lyrical NOT selected: no payment, go directly to success
      const isPaidInAdvanceNoLyrical = isPaidInAdvance && !lyricalServices;
      if (isPaidInAdvanceNoLyrical) {
        const response = await axiosApi.post(
          "/insert-calender-song-project",
          {
            oph_id: ophid,
            song_name: location.state.songName,
            project_type: projectType,
            release_date: location.state.release_date,
            song_id: contentId,
          },
          {
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.data.success) {
          setIsLoading(false);
          const paymentUpdateResponse = await axiosApi.post(
            "/insert-songid-payment",
            { ophid: ophid, song_id: contentId },
            {
              headers: {
                "Content-Type": "application/json",
              },
            },
          );

          if (paymentUpdateResponse.data.success) {
            navigate("/dashboard/success", {
              state: {
                heading: "Your Song Is Officially Registered!",
                btnText: "Back to Home",
                redirectTo: "/dashboard",
              },
            });
          }
        }
        return;
      }
      // "paid in advance" + lyrical_services: do not redirect here; fall through to success
      // so we stay on page with read-only form + Pay now

      if (response.data.success) {
        setIsLoading(false);

        // Refetch video metadata so read-only view shows saved thumbnails and video URLs
        const refetchForReadOnly = async () => {
          try {
            const res = await axiosApi.get(`/video-details`, {
              headers,
              params: { contentId },
            });
            if (res.data?.success && res.data?.data?.video_metadata?.[0]) {
              const d = res.data.data.video_metadata[0];
              let imageUrls = [];
              const rawImageUrl = d.image_url ?? d.image_URL;
              if (rawImageUrl != null) {
                if (Array.isArray(rawImageUrl)) imageUrls = rawImageUrl;
                else if (typeof rawImageUrl === "string") {
                  try {
                    const parsed = JSON.parse(rawImageUrl);
                    imageUrls = Array.isArray(parsed)
                      ? parsed
                      : [parsed].filter(Boolean);
                  } catch {
                    imageUrls = [rawImageUrl].filter(Boolean);
                  }
                }
              }
              const videoUrl = d.video_url ?? d.video_URL ?? null;
              setFormData((prev) => ({
                ...prev,
                credits: d.credits || prev.credits,
                existing_thumbnails: imageUrls,
                existing_video_url: videoUrl || prev.existing_video_url,
                video_file: null,
                thumbnails: [],
              }));
            }
          } catch (e) {
            console.warn("Refetch video metadata after submit:", e);
          }
        };

        if (response.data.paymentOnlyRepay === true) {
          await refetchForReadOnly();
          setShowPayNowAfterSubmit(true);
          return;
        }

        // Paid in advance + lyrical: only show Pay now when PAYMENT is rejected, not when only video was rejected
        const isPaidInAdvanceWithLyrical = isPaidInAdvance && lyricalServices;
        if (isPaidInAdvanceWithLyrical) {
          const isPaymentRejected =
            nextPage === "repayment" ||
            nextPage === "payment" ||
            location.state?.rejectedSections?.some(
              (s) => s.section === "payment",
            );
          if (isPaymentRejected) {
            await refetchForReadOnly();
            setShowPayNowAfterSubmit(true);
          } else {
            // Video resubmitted, payment already approved → go under review
            navigate("/dashboard/pending", {
              state: {
                heading: "Your video details are under review",
                btnText: "Upload a new song",
                redirectTo: "/dashboard/upload-song",
              },
            });
          }
          return;
        }

        // Check if there's a redirect path from backend (for rejected sections)
        if (response.data.redirectPath) {
          if (response.data.redirectPath === "/dashboard/success") {
            navigate("/dashboard/success", {
              state: {
                heading:
                  "Your song registration has been completed successfully!",
                btnText: "Back to Home",
                redirectTo: "/dashboard",
              },
            });
          } else if (
            response.data.redirectPath ===
            "/dashboard/upload-song/audio-metadata/"
          ) {
            // Redirect to audio metadata
            navigate("/dashboard/upload-song/audio-metadata/", {
              state: {
                song_id: contentId,
                songName: response.data.songName || location.state.songName,
                release_date: location.state.release_date,
                project_type: location.state.project_type,
                lyrical_services: location.state.lyrical_services,
                isFixingRejected: true,
              },
            });
          } else if (
            response.data.redirectPath ===
            "/dashboard/upload-song/video-metadata/"
          ) {
            // Redirect to video metadata (shouldn't happen after submitting video, but handle it)
            navigate("/dashboard/upload-song/video-metadata/", {
              state: {
                song_id: contentId,
                songName: response.data.songName || location.state.songName,
                release_date: location.state.release_date,
                project_type: location.state.project_type,
                lyrical_services: location.state.lyrical_services,
                isFixingRejected: true,
              },
            });
          } else if (response.data.redirectPath === "/auth/payment") {
            await refetchForReadOnly();
            setShowPayNowAfterSubmit(true);
          } else {
            // Fallback to default navigation
            navigate(response.data.redirectPath);
          }
        } else {
          // Default: only show Pay now when payment step is actually rejected (not when only video was rejected)
          if (nextPage === "repayment" || nextPage === "payment") {
            await refetchForReadOnly();
            setShowPayNowAfterSubmit(true);
          } else if (nextPage === "pending") {
            navigate("/dashboard/pending", {
              state: {
                heading: "Your video details are under review",
                btnText: "Upload a new song",
                redirectTo: "/dashboard/upload-song",
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error uploading video metadata:", error);
      const status = error.response?.status;
      const msg = error.response?.data?.message;
      if (status === 401) {
        toast.error(
          msg || "Session expired or not signed in. Please log in again.",
        );
      } else {
        toast.error("Failed to upload video metadata. Please try again.");
      }
    } finally {
      if (progressCleanupRef.current) {
        progressCleanupRef.current();
        progressCleanupRef.current = null;
      }
      setIsSubmitting(false);
      setIsLoading(false);
      setUploadProgress({
        percentage: 0,
        loadedMB: 0,
        totalMB: 0,
        speed: 0,
        time: 0,
        isUploading: false,
      });
    }
  };

  const checkIfDateIsAvail = () => {
    const check = checkBookingDates.find((date) => {
      const formattedDate = new Date(
        location.state.release_date,
      ).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
      });

      const formattedReleaseDate = new Date(date.date).toLocaleDateString(
        "en-IN",
        {
          timeZone: "Asia/Kolkata",
        },
      );

      if (formattedReleaseDate === formattedDate && date.ophid !== ophid) {
        return date;
      }
    });

    if (check) {
      setNavigateToSongReg(true);
    }
  };

  const checkAlreadyBookedDate = async () => {
    try {
      if (!headers || !headers.Authorization) {
        console.warn("Headers are not ready yet");
        return;
      }

      const response = await axiosApi.get("/bookings", {
        headers: headers,
      });

      if (response.data.success) {
        const date = response.data.data.map((data) => {
          return {
            date: data.current_booking_date,
            ophid: data.oph_id,
          };
        });
        setCheckBookingDates(date);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVideoMetadata = async () => {
    setIsLoading(true);
    if (!contentId) {
      setError("No content ID provided");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axiosApi.get(`/video-details`, {
        headers,
        params: { contentId },
      });

      if (response.data.success) {
        const { video_metadata } = response?.data?.data;
        const data = video_metadata?.[0];

        // If no data, still set loading to false and return
        if (!data) {
          setIsLoading(false);
          return;
        }

        // Parse existing image URLs (API may return string or already-parsed array; support both key casings)
        let imageUrls = [];
        const rawImageUrl = data.image_url ?? data.image_URL;
        if (rawImageUrl != null) {
          if (Array.isArray(rawImageUrl)) imageUrls = rawImageUrl;
          else if (typeof rawImageUrl === "string") {
            try {
              const parsed = JSON.parse(rawImageUrl);
              imageUrls = Array.isArray(parsed)
                ? parsed
                : [parsed].filter(Boolean);
            } catch {
              imageUrls = [rawImageUrl].filter(Boolean);
            }
          }
        }

        const videoUrl = data.video_url ?? data.video_URL ?? null;

        setFormData({
          credits: data.credits || "",
          existing_thumbnails: imageUrls,
          thumbnails: [],
          video_file: null,
          existing_video_url: videoUrl,
          reject_reason: data.reject_reason || null,
        });
      }
    } catch (err) {
      console.error("Error fetching video metadata:", err);
      setError("Failed to load video metadata");
    } finally {
      setIsLoading(false);
      setVideoMetadataLoaded(true);
    }
  };

  useEffect(() => {
    if (checkBookingDates.length > 0) {
      checkIfDateIsAvail();
    }
  }, [checkBookingDates]);

  useEffect(() => {
    // Sync song navigation when entering this page (e.g. after browser back from payment).
    // Backend sets status to draft when not fixing a rejected step, so song shows as Draft.
    if (contentId && ophid && headers?.Authorization && location.pathname) {
      axiosApi
        .post(
          "/update-song-navigation",
          {
            song_id: contentId,
            oph_id: ophid,
            next_page: location.pathname,
          },
          { headers },
        )
        .catch(() => {});
    }

    // Draft: check if release date is still free on calendar; if taken, redirect to register-song
    const releaseDateRaw =
      location.state?.release_date ?? location.state?.booking_date;
    if (contentId && releaseDateRaw && headers?.Authorization) {
      const releaseDateForApi =
        typeof releaseDateRaw === "string" && releaseDateRaw.includes("/")
          ? releaseDateRaw.split("/").reverse().join("-")
          : releaseDateRaw;
      axiosApi
        .get("/check-release-date-available", {
          headers,
          params: {
            release_date: releaseDateForApi,
            song_id: contentId,
            ophid,
          },
        })
        .then((res) => {
          if (res.data.success && res.data.available === false) {
            navigate("/dashboard/upload-song/register-song", {
              replace: true,
              state: {
                song_id: contentId,
                songName: location.state?.songName || songName,
                release_date: releaseDateRaw,
                project_type: location.state?.project_type,
                lyrical_services: location.state?.lyrical_services,
                dateNoLongerAvailable: true,
                returnToPage: "/dashboard/upload-song/video-metadata",
              },
            });
          }
        })
        .catch(() => {});
    }
    setPaymentCheckDone(false);
    checkAlreadyBookedDate();
    fetchVideoMetadata();
    checkPaymentStaus();

    // Re-run when contentId, headers, ophid, or location (e.g. returning from payment cancel) changes
    // location.key changes on every navigate, so we re-fetch when user comes back to this page
  }, [contentId, headers, ophid, location.key, location.pathname]);

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (navigateToSongReg) {
    navigate("/dashboard/upload-song/register-song", {
      replace: true,
      state: {
        song_id: contentId,
        songName,
        release_date:
          location.state?.release_date ?? location.state?.booking_date,
        project_type: location.state?.project_type,
        lyrical_services: location.state?.lyrical_services,
        dateNoLongerAvailable: true,
        returnToPage: "/dashboard/upload-song/video-metadata",
      },
    });
    return null;
  }

  const holdForPaymentResumeUi =
    !!contentId &&
    !isPaidInAdvanceNoLyricalCheck &&
    (paymentOnlyRejectedFromNav ||
      location.state?.showPayNowOnVideo === true) &&
    (!videoMetadataLoaded || !paymentCheckDone);

  if (holdForPaymentResumeUi) {
    return (
      <div className="min-h-[calc(100vh-70px)] text-gray-100 px-8 p-6">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:px-8 lg:p-6">
      <div className="w-full space-y-8">
        <div className="flex justify-between flex-col lg:flex-row mb-8">
          <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
            <NavbarLeft />
            <NavbarRight />
          </div>
          <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
            VIDEO METADATA
          </h2>
          <div className="hidden lg:block">
            <NavbarRight />
          </div>
        </div>
        {formData.reject_reason && (
          <p className="text-red-700">
            Video rejection reason: {formData.reject_reason}
          </p>
        )}

        {payStat && payStat.trim() !== "" && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-400 font-semibold mb-1">Payment Rejection</p>
            <p className="text-red-300 text-sm">{payStat}</p>
          </div>
        )}

        {/* Payment next: same route/flow as before, but no read-only field preview — full form stays below for active submit */}
        {showReadOnlyAndPayNow ? (
          <div className="space-y-8 max-w-[780px] w-full">
            <div className="rounded-2xl border-2 border-cyan-500/50 bg-gray-900/70 px-10 py-12 px-[16px] sm:px-14 sm:py-16 min-h-[220px] sm:min-h-[260px] flex flex-col justify-center shadow-[0_0_40px_rgba(34,211,238,0.12)] ">
              <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-cyan-300 leading-snug">
                Video details have been submitted successfully.
              </p>
              <p className="mt-5 sm:mt-6 text-gray-400 text-base sm:text-lg md:text-xl max-w-3xl">
                Proceed to payment to continue your registration.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate("/auth/payment", {
                  state: {
                    from: "Song Repayment",
                    booking_date: formattedDate || location.state?.release_date,
                    release_date: formattedDate || location.state?.release_date,
                    song_id: contentId,
                    songName: location.state?.songName || songName,
                    project_type: projectType,
                    lyrical_services: location.state?.lyrical_services,
                    backPath: "/dashboard/upload-song/video-metadata",
                  },
                })
              }
              className="w-full max-w-4xl bg-cyan-400 text-gray-900 rounded-full py-4 text-lg font-semibold hover:bg-cyan-300 transition-colors"
            >
              Pay now
            </button>
          </div>
        ) : (
          <>
            {(isLoading ||
              isRemoving ||
              isUploading ||
              uploadProgress.isUploading) && (
              <div className="text-center py-4 min-h-[calc(100dvh-170px)] flex justify-center items-center flex-col">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="mt-2 text-cyan-400 max-w-[800px]">
                  India's First Music Community Platform - Somewhere out there,
                  someone could be looking for exactly what you create. We’re
                  building a community helps discover artists, opportunities,
                  and grow together.
                </p>
              </div>
            )}

            {/* 
            <Loading
              progress={uploadProgress.isUploading ? uploadProgress : undefined}
            /> */}

            {!isLoading &&
              !isRemoving &&
              !isUploading &&
              !uploadProgress.isUploading && (
                <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                  {/* Song Name Display */}
                  <div className="space-y-2">
                    <label className="block text-gray-400">Song Name:</label>
                    <input
                      disabled
                      value={songName}
                      className="w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                      type="text"
                    />
                  </div>

                  {/* Credits */}
                  <div className="space-y-2">
                    <label className="block">
                      Credits <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.credits}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credits: e.target.value,
                        }))
                      }
                      placeholder="Enter credits..."
                      rows={4}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-cyan-400"
                      required
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span>
                        Upload Maximum 3 Pictures{" "}
                        <span className="text-red-500">*</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {formData.existing_thumbnails?.map((url, index) => (
                        <div
                          key={`existing-${index}`}
                          className="relative aspect-square"
                        >
                          <img
                            src={url}
                            alt={`Existing thumbnail ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingPhoto(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {formData.thumbnails.map((photo, index) => (
                        <div
                          key={`new-${index}`}
                          className="relative aspect-square"
                        >
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {formData.thumbnails.length +
                        (formData.existing_thumbnails?.length || 0) <
                        3 && (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            multiple
                          />
                          <div className="aspect-square border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center hover:border-cyan-400 transition-colors">
                            <Plus className="w-8 h-8 text-gray-500" />
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Video Upload */}
                  {!hasPaidForLyricalVideo && (
                    <div className="space-y-2">
                      <label className="block">
                        Select the Video File{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      {formData.existing_video_url && !formData.video_file && (
                        <div className="mb-2">
                          <p className="text-sm text-gray-400">
                            Existing video file:
                          </p>
                          <CustomVideoPlayer
                            src={formData.existing_video_url}
                            className="w-full mt-2 rounded-lg"
                            pauseOtherVideos={true}
                          />
                        </div>
                      )}
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors">
                          {formData.video_file ? (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-cyan-400">
                                {formData.video_file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    video_file: null,
                                  }))
                                }
                                className="p-1 hover:text-red-500"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Plus className="w-8 h-8 text-gray-500" />
                              <span className="text-gray-500">
                                {formData.existing_video_url
                                  ? "Upload New Video File"
                                  : "Select the Video File"}
                              </span>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Submit Button - submit video first; after submit, backend redirects to payment if payment is also rejected */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors disabled:bg-gray-400"
                  >
                    {isLoading ? "Loading..." : "Submit"}
                  </button>
                  {nextPage === "repayment" && formData.reject_reason && (
                    <p className="text-gray-400 text-sm text-center mt-2">
                      After submitting, you will be redirected to complete
                      payment if needed.
                    </p>
                  )}
                </form>
              )}
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}
