import React from "react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useArtist } from "../auth/API/ArtistContext";
import axiosApi from "../../conf/axios";
import Loading from "../../components/Loading";
import toast from "react-hot-toast";

const PaymentScreen = () => {
  const { logout, headers, ophid } = useArtist();
  const navigate = useNavigate();
  const location = useLocation();
  console.log(location);

  const [trans, setTrans] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [costingData, setCostingData] = useState([]);
  const [matchedCosting, setMatchedCosting] = useState(null);
  const event_id = location.state?.event_id;
  // Set from_source based on event_id if not provided
  const from = location.state?.from || (event_id ? "Event Registration" : null);
  const song_id = location.state?.song_id;

  console.log(song_id);

  const outside_user = location.state?.outside_user;
  const user_type = location.state?.user_type;
  const [oph_id, setoph_id] = useState("");

  console.log(user_type);

  const {
    amount = 0,
    paymentRepayAmount,
    backPath,
    returnPath,
    heading = "Payment Required",
    lyrical_services = false,
    isFixingRejected = false,
  } = location.state || {};

  const backPathOrReturn = backPath ?? returnPath ?? "/dashboard";

  // Debug log for lyricalVid flag
  console.log("PaymentScreen - lyricalVid flag:", lyrical_services);

  // Function to fetch costing data and match with 'from' field
  const fetchCostingData = useCallback(async () => {
    try {
      setLoading(true);

      // Check if this is an event registration
      if (from === "Event Registration" && event_id) {
        const response = await axiosApi.get(`/event/${event_id}`);

        if (response.status === 200) {
          const eventData = response.data.data;
          console.log(eventData);

          // Set output_user to "outside user"

          // Calculate amount based on output_user
          const registrationFee = eventData.registrationFee_normal;
          console.log(outside_user);
          console.log(registrationFee);
          const rawFinalAmount =
            outside_user === true || outside_user === 1
              ? registrationFee // Full amount for outside users
              : registrationFee / 2; // Half amount for regular users
          const finalAmount = Math.round(Number(rawFinalAmount));

          // Create a mock costing object for event data
          const eventCosting = {
            name: "Event Registration",
            cost: finalAmount,
            qr_image_path:
              outside_user === true || outside_user === 1
                ? eventData.payment_qr || "/qr.png"
                : eventData.payment_qr_discount || "/qr.png",
          };

          setMatchedCosting(eventCosting);
          console.log(
            `Using event costing data for Event ID: ${event_id} (Original Amount: ${registrationFee}, Final Amount: ${finalAmount}, Outside User: ${outside_user})`,
          );
        }
      } else {
        // Regular costing data fetch for other services
        const response = await axiosApi.get("/get_costing");

        if (response.data.success) {
          // Handle both array and single object responses
          const costingData = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];

          console.log(costingData);

          setCostingData(costingData);

          // Match the 'from' field with costing data 'name' field
          // If lyricalVid is true, use "lyrical video" data regardless of 'from' value
          // If no 'from' is provided, default to "Registration"
          // Handle "Registration" and "Song Registration" as separate cases
          let searchName;
          console.log(from);
          console.log(user_type);

          const isLyricalSelected =
            lyrical_services === true ||
            lyrical_services === "true" ||
            lyrical_services === 1;
          const projectType =
            location.state?.project_type || location.state?.projectType || "";
          const isPaidInAdvance =
            String(projectType).toLowerCase().trim() === "paid in advance";
          if (isLyricalSelected) {
            // Paid in advance + lyrical = "lyrics service" (399). Otherwise "lyrical video"
            if (isPaidInAdvance) {
              searchName = "lyrics service";
            } else {
              searchName = "lyrical video";
            }
          } else {
            // Handle case when no 'from' is provided - default to Registration
            if (!from || from === "Registration") {
              // Check if user_type is special artist
              if (user_type === "Special artist") {
                searchName = "special artist registration";
              } else {
                searchName = "registration";
              }
            } else {
              searchName = from.toLowerCase();
              if (searchName === "song repayment") {
                searchName = "song registration";
              }
              // Date booking also uses Song Registration data
              if (searchName === "date booking") {
                searchName = "song registration";
              }
              // Handle "Release date change" as a separate case
              if (searchName === "release date change") {
                searchName = "release date change";
              }

              console.log(searchName);

              // "registration" stays as "registration"
              // "song registration" stays as "song registration"
            }
          }

          const matched = costingData.find(
            (item) => item.name && item.name.toLowerCase() === searchName,
          );
          console.log(matched);

          if (matched) {
            setMatchedCosting(matched);
            console.log(
              `Using costing data for: ${
                from || "default"
              } (lyricalVid: ${lyrical_services}) -> ${matched.name} (Amount: ${
                matched.cost
              })`,
            );
          } else {
            // Fallback to default amounts if no match found
            console.warn(
              `No costing data found for: ${
                from || "default"
              } (lyricalVid: ${lyrical_services}) - using fallback amounts`,
            );
          }
        }
      }
    } catch (err) {
      console.error("Error fetching costing data:", err);
      toast.error("Failed to fetch payment information");
    } finally {
      setLoading(false);
    }
  }, [
    from,
    lyrical_services,
    event_id,
    location.state?.project_type,
    location.state?.projectType,
  ]);

  const normName = (s) =>
    String(s ?? "")
      .toLowerCase()
      .trim();

  /** Prefer exact name match, then shortest name that still contains `search` (avoids wrong row when multiple names overlap). */
  const findCostingRowByName = (search) => {
    const needle = normName(search);
    if (!needle) return null;
    const arr = (
      Array.isArray(costingData) ? costingData : [costingData]
    ).filter((c) => c?.name);
    const exact = arr.find((c) => normName(c.name) === needle);
    if (exact) return exact;
    const candidates = arr.filter((c) => normName(c.name).includes(needle));
    if (candidates.length === 0) return null;
    candidates.sort(
      (a, b) => normName(a.name).length - normName(b.name).length,
    );
    return candidates[0];
  };

  const getCostByName = (search) => {
    const row = findCostingRowByName(search);
    return row ? parseFloat(row.cost) : null;
  };

  // Function to get the appropriate amount based on the matched costing data or fallback from costing table
  const getDisplayAmount = () => {
    // Repayment: use exact amount for rejected payment(s) only
    const repay =
      paymentRepayAmount ?? (isFixingRejected && amount ? amount : null);
    if (repay != null && repay > 0) return parseFloat(repay);

    if (matchedCosting) {
      return parseFloat(matchedCosting.cost);
    }

    // Fallback: derive from costing table by name
    if (lyrical_services) {
      return (
        getCostByName("lyrics service") ??
        getCostByName("lyrical video") ??
        amount
      );
    }
    if (!from || from === "Registration") {
      return getCostByName("registration") ?? amount;
    }
    if (
      from === "Song Repayment" ||
      from === "Song Registration" ||
      from === "Date booking"
    ) {
      return getCostByName("song registration") ?? amount;
    }
    if (from === "Event Registration") return getCostByName("event") ?? amount;
    if (from === "Release date change")
      return getCostByName("release date change") ?? amount;
    if (from === "Special artist song registration")
      return getCostByName("special artist") ?? amount;
    return amount;
  };

  // Function to get the QR code image (from costing table)
  const getQRCodeImage = () => {
    if (matchedCosting?.qr_image_path) return matchedCosting.qr_image_path;
    let item = null;
    if (lyrical_services)
      item =
        findCostingRowByName("lyrics service") ||
        findCostingRowByName("lyrical video");
    else if (!from || from === "Registration")
      item = findCostingRowByName("registration");
    else if (
      from === "Song Repayment" ||
      from === "Song Registration" ||
      from === "Date booking"
    )
      item = findCostingRowByName("song registration");
    else if (from === "Release date change")
      item = findCostingRowByName("release date change");
    else if (from === "Special artist song registration")
      item = findCostingRowByName("special artist");
    return item?.qr_image_path || "/qr.png";
  };

  useEffect(() => {
    if (ophid) {
      setoph_id(ophid);
    } else if (location.state?.OPH_ID) {
      setoph_id(location.state.OPH_ID);
    }
  }, [ophid, location.state?.OPH_ID]);

  useEffect(() => {
    fetchCostingData();
  }, [fetchCostingData]);

  // Sync song navigation when entering payment page for a song (e.g. after browser back from another tab).
  // Backend sets status to draft when not fixing a rejected step.
  useEffect(() => {
    const isSongPayment =
      song_id && (from === "Song Registration" || from === "Song Repayment");
    if (isSongPayment && ophid && headers?.Authorization && location.pathname) {
      axiosApi
        .post(
          "/update-song-navigation",
          {
            song_id,
            oph_id: ophid,
            next_page: location.pathname,
          },
          { headers },
        )
        .catch(() => {});
    }
  }, [song_id, from, ophid, headers, location.pathname]);

  const handlePaymentSuccess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Debug logs for payment data
    console.log("=== PAYMENT DEBUG LOGS ===");
    console.log("Raw location.state:", location.state);
    console.log("Extracted values:");
    console.log("- from:", from, "(type:", typeof from, ")");
    console.log("- event_id:", event_id, "(type:", typeof event_id, ")");
    console.log("- song_id:", song_id, "(type:", typeof song_id, ")");
    console.log("- oph_id:", oph_id, "(type:", typeof oph_id, ")");
    console.log("- trans:", trans, "(type:", typeof trans, ")");

    try {
      const rawDate =
        location.state.release_date ||
        location.state.booking_date ||
        location.state.date ||
        location.state.new_booking_date;
      const toYYYYMMDD = (v) => {
        if (v == null || v === "") return null;
        const s = String(v).trim();
        if (
          !s ||
          s === "0000-00-00" ||
          s.toLowerCase().startsWith("0000-00-00")
        )
          return null;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const parts = s.split(/[/-T]/);
        if (parts.length >= 3) {
          const [a, b, c] = parts;
          if (a.length === 4)
            return `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}`;
          if (c.length === 4)
            return `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
        }
        return null;
      };
      const release_date = toYYYYMMDD(rawDate);

      const formData = {
        OPH_ID: oph_id,
        Transaction_ID: trans,
        Review: 0,
        Status: "under review",
        step: "/auth/create-profile/personal-details",
        from: from,
        song_id: song_id,
        event_id: event_id,
        release_date:
          from === "Release date change"
            ? location?.state?.new_booking_date ||
              location?.state?.release_date ||
              null
            : location?.state?.date ||
              location?.state?.booking_date ||
              location?.state?.new_booking_date ||
              null,
        old_release_date: location?.state?.old_booking_date || null,
        change_reason: location?.state?.reason || null,
        lyricalVid: lyrical_services,
        amount: getDisplayAmount(),
      };

      // Include booking_details for event registration (creates event_bookings only on payment submit)
      if (from === "Event Registration" && location.state?.booking_details) {
        const bd = location.state.booking_details;
        formData.first_name = bd.first_name;
        formData.last_name = bd.last_name;
        formData.email = bd.email;
        formData.phone = bd.phone;
        formData.instagram_handle = bd.instagram_handle;
        formData.profession_id = bd.profession_id;
      }

      console.log("Final formData being sent:", formData);
      console.log(
        "API Path:",
        from === "Song Repayment" ? "/song-payment" : "/auth/payment",
      );
      console.log("=========================");

      const apiPath =
        from === "Song Repayment" ? "/song-payment" : "/auth/payment";

      const response = await axiosApi.post(apiPath, formData);

      if (!response.data?.success) {
        setError(
          response.data?.message ||
            "Payment processing failed. Please try again.",
        );
        return;
      }

      if (response.data.success && from == "Date booking") {
        {
          // For Date Booking repayment with linked song, pass song_id and song_name
          const bookingDate =
            location.state.date ||
            location.state.booking_date ||
            location.state.release_date;
          const CalenderRes = await axiosApi.post(
            "/booking",
            {
              oph_id: oph_id,
              booking_date: bookingDate,
              song_name: location.state.songName || null,
              project_type: location.state.project_type || null,
              song_id: song_id || location.state.song_id || null,
            },
            { headers: headers },
          );

          if (CalenderRes.data.success) {
            navigate("/dashboard/success", {
              state: {
                heading: "Your date blocked successfully!",
                btnText: "View Calendar",
                redirectTo: "/dashboard/time-calendar",
              },
            });
          }
        }
      } else if (response.data.success && from == "Release date change") {
        navigate("/dashboard/success", {
          state: {
            heading:
              response.data.message ||
              (response.data.alreadyPending
                ? "Your release date change is already submitted and pending admin approval."
                : "Release date change submitted — pending admin approval"),
            btnText: "View Calendar",
            redirectTo: "/dashboard/time-calendar",
          },
        });
      } else if (
        response.data.success &&
        from == "Song Registration" &&
        location.state.project_type !== "paid in advance"
      ) {
        {
          console.log("in song", location.state.project_type);

          const CalenderRes = await axiosApi.post(
            "/booking",
            {
              oph_id: oph_id,
              booking_date: location.state.booking_date,
              song_name: location.state.songName,
              project_type: location.state.project_type,
              song_id: location.state.song_id || song_id,
            },
            { headers: headers },
          );

          if (CalenderRes.data.success) {
            // Check if there's a redirect path from backend (for rejected sections)
            if (
              response.data.redirectPath &&
              response.data.redirectPath !== "/dashboard/success"
            ) {
              if (
                response.data.redirectPath ===
                "/dashboard/upload-song/audio-metadata/"
              ) {
                navigate("/dashboard/upload-song/audio-metadata/", {
                  state: {
                    song_id: location.state.song_id,
                    songName: response.data.songName || location.state.songName,
                    release_date: location.state.booking_date,
                    project_type: location.state.project_type,
                    lyrical_services: location.state.lyrical_services,
                    isFixingRejected: true,
                  },
                });
              } else if (
                response.data.redirectPath ===
                "/dashboard/upload-song/video-metadata/"
              ) {
                navigate("/dashboard/upload-song/video-metadata/", {
                  state: {
                    song_id: location.state.song_id,
                    songName: response.data.songName || location.state.songName,
                    release_date: location.state.booking_date,
                    project_type: location.state.project_type,
                    lyrical_services: location.state.lyrical_services,
                    isFixingRejected: true,
                  },
                });
              } else {
                navigate(response.data.redirectPath);
              }
            } else {
              navigate("/dashboard/success", {
                state: {
                  heading: "Your Song Is Officially Registered!",
                  btnText: "View Song Status",
                  redirectTo: "/dashboard/upload-song",
                },
              });
            }
          }
        }
      } else if (
        response.data.success &&
        from == "Song Registration" &&
        location.state.project_type === "paid in advance"
      ) {
        console.log("in sdasdsd");

        const response = await axiosApi.post(
          "/insert-calender-song-project",
          {
            oph_id: ophid,
            song_name: location.state.songName,
            project_type: location.state.project_type,
            release_date: location.state.booking_date,
            song_id: location.state.song_id || song_id,
          },
          {
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.data.success) {
          navigate("/dashboard/success", {
            state: {
              heading: "Your Song Is Officially Registered!",
              btnText: "View Song Status",
              redirectTo: "/dashboard/upload-song",
            },
          });
        }
      } else if (response.data.success && from === "Song Repayment") {
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
                song_id: location.state.song_id,
                songName: response.data.songName || location.state.songName,
                release_date: location.state.booking_date,
                project_type: location.state.project_type,
                lyrical_services: location.state.lyrical_services,
                isFixingRejected: true,
              },
            });
          } else if (
            response.data.redirectPath ===
            "/dashboard/upload-song/video-metadata/"
          ) {
            // Redirect to video metadata
            navigate("/dashboard/upload-song/video-metadata/", {
              state: {
                song_id: location.state.song_id,
                songName: response.data.songName || location.state.songName,
                release_date: location.state.booking_date,
                project_type: location.state.project_type,
                lyrical_services: location.state.lyrical_services,
                isFixingRejected: true,
              },
            });
          } else {
            // Fallback to default navigation
            navigate(response.data.redirectPath);
          }
        } else {
          // Default behavior
          navigate("/dashboard/success", {
            state: {
              heading: "Your Song Is Officially Registered!",
              btnText: "View Song Status",
              redirectTo: "/dashboard/upload-song",
            },
          });
        }
      } else if (response.data.success && from === "Event Registration") {
        // External users: booking created by PaymentService, navigate to success
        // Internal users: event_participants updated by PaymentService, /event_part is legacy
        const isExternal = location.state?.outside_user === true;
        const redirectTo =
          location.state?.returnPath || "/events/online-music-events";

        if (isExternal) {
          navigate("/success", {
            state: {
              heading: "Your Event Spot has been booked Successfully!",
              btnText: "Check Out More Events",
              redirectTo,
            },
            replace: true,
          });
        } else {
          const eventResponse = await axiosApi.post(
            "/event_part",
            { OPH_ID: oph_id, event_id: location.state.event_id },
            {
              headers: {
                "Content-Type": "application/json",
                ...headers,
              },
            },
          );

          if (eventResponse.status === 201) {
            navigate("/dashboard/success", {
              state: {
                heading: "You’re In! Successfully Registered for the Event!",
                btnText: "Back to Events",
                redirectTo: location.state?.returnPath || "/dashboard/events",
              },
            });
          }
        }
      } else if (
        response.data.success &&
        from === "Special artist song registration"
      ) {
        {
          navigate("/dashboard/pending", {
            state: {
              heading: "Your Song Is Successfully Submitted for Review!",
              btnText: "Back to Manage",
              redirectTo: "/dashboard",
            },
          });
        }
      } else if (response.data.success) {
        const path = response.data.step;
        console.log(path);

        navigate(path);
      }
    } catch (err) {
      console.error("Payment error:", err);
      const serverMessage =
        err.response?.data?.message || err.response?.data?.error;
      setError(serverMessage || "Payment processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const isSongPayment =
      song_id && (from === "Song Registration" || from === "Song Repayment");
    const pathToSet =
      backPathOrReturn && backPathOrReturn.trim() !== ""
        ? backPathOrReturn
        : "/dashboard/upload-song/video-metadata";

    if (isSongPayment && ophid && headers?.Authorization && pathToSet) {
      // Set song to draft immediately when leaving payment without paying (so list shows Draft, not Under Review)
      axiosApi
        .post(
          "/update-song-navigation",
          {
            song_id,
            oph_id: ophid,
            next_page: pathToSet,
          },
          { headers },
        )
        .catch(() => {})
        .finally(() => {
          navigate(pathToSet, {
            replace: true,
            state: {
              from: location.state?.from,
              booking_date:
                location.state?.release_date ?? location.state?.booking_date,
              release_date:
                location.state?.release_date ?? location.state?.booking_date,
              song_id: location.state?.song_id,
              songName: location.state?.songName,
              project_type: location.state?.project_type,
              lyrical_services: location.state?.lyrical_services,
            },
          });
        });
    } else {
      navigate(backPathOrReturn, {
        replace: true,
        state: {
          from: location.state?.from,
          booking_date:
            location.state?.release_date ?? location.state?.booking_date,
          release_date:
            location.state?.release_date ?? location.state?.booking_date,
          song_id: location.state?.song_id,
          songName: location.state?.songName,
          project_type: location.state?.project_type,
          lyrical_services: location.state?.lyrical_services,
        },
      });
    }
  };

  return (
    <div className="relative">
      {loading && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-cyan-400 text-center">
            Your transaction is being processed. Please wait a moment.
          </p>
        </div>
      )}
      <div className="bg-black min-h-[100vh] text-white flex flex-col items-center justify-center px-[16px] py-[16px] md:p-8">
        <h1 className="text-cyan-400 text-xl font-extrabold mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,1)] text-center sm:pt-0 pt-8">
          {heading}{" "}
          <span className="text-cyan-400">
            {from === "Release date change"
              ? ""
              : `₹${Math.round(Number(getDisplayAmount()) || 0)}/-`}
          </span>
        </h1>

        <div className="flex flex-col items-center gap-6 max-w-md w-full">
          <img
            src={getQRCodeImage()}
            alt="QR Code"
            className="w-48 h-48 drop-shadow-[0_0_15px_rgb(252 253 253 / 45%))]"
          />

          <h2 className="text-xl text-center">
            SCAN QR AND PAY WITH ANY UPI APPS
          </h2>

          <div className="text-gray-400 text-sm text-center">
            Scan QR code | Complete Payment
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <form onSubmit={handlePaymentSuccess} className="w-full space-y-4">
            <input
              type="text"
              placeholder="Enter your UPI ID here"
              value={trans}
              onChange={(e) => setTrans(e.target.value)}
              className="w-full rounded-full px-4 py-3 text-white text-center border border-gray-600 sm:bg-gray-800 sm:rounded-md"
              style={{ backgroundColor: "rgba(47, 43, 43, 0.577)" }}
              required
              disabled={loading}
            />

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="w-full border border-cyan-400 text-cyan-400 py-3 rounded-md"
                disabled={loading}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="w-full bg-cyan-400 text-black py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;
