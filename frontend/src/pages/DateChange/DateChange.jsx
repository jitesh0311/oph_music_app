import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axiosApi from "../../conf/axios";

import { toast, Bounce, ToastContainer } from "react-toastify";
import NavbarRight from "../../components/Navbar/NavbarRight";
import { useArtist } from "../auth/API/ArtistContext";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

export default function DateChangeForm() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [newDateTaken, setNewDateTaken] = useState(false);
  const [checkingNewDate, setCheckingNewDate] = useState(false);
  const [formData, setFormData] = useState({
    contentId: location.state?.contentId || "",
    oldDate: location.state?.date || "",
    newDate: "",
    reason: "",
  });
  const { headers, ophid } = useArtist();

  useEffect(() => {
    const dateStr = formData.newDate?.slice?.(0, 10) || formData.newDate;
    if (!dateStr || !ophid) {
      setNewDateTaken(false);
      return;
    }

    let cancelled = false;
    const checkAvailability = async () => {
      setCheckingNewDate(true);
      try {
        const response = await axiosApi.get("/check-release-date-available", {
          params: { release_date: dateStr, ophid },
          headers,
        });
        if (!cancelled) {
          setNewDateTaken(response.data?.available === false);
        }
      } catch (error) {
        console.error("Error checking date availability:", error);
        if (!cancelled) setNewDateTaken(true);
      } finally {
        if (!cancelled) setCheckingNewDate(false);
      }
    };

    checkAvailability();
    return () => {
      cancelled = true;
    };
  }, [formData.newDate, ophid, headers]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newDateTaken) {
      toast.error("This date is already booked by another artist");
      return;
    }
    if (formData.newDate === formData.oldDate) {
      toast.error("New date cannot be the same as the old date");
      return;
    }

    setIsProcessing(true);
    try {
      // const response = await axiosApi.post(
      //   "/date-block/change",
      //   {
      //     old_date: formData.oldDate,
      //     new_date: formData.newDate,
      //     reason: formData.reason,
      //     content_id: formData.contentId,
      //   },
      //   {
      //     headers: headers,
      //   }
      // );

      navigate("/auth/payment", {
        state: {
          old_booking_date: formData.oldDate,
          new_booking_date: formData.newDate,
          returnPath: "/dashboard/time-calendar",
          amount: 100,
          heading: "Date Change Fee — ₹100/- (Subject to Admin Approval upon Payment.)",
          from: "Release date change",
          reason: formData.reason,
        },
      });
    } catch (error) {
      console.error("Error changing date:", error);
      toast.error("Error changing date. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:px-8 lg:py-6">
      <div className="w-full">
        <div className="flex flex-col lg:flex-row justify-between mb-8">
          <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
            <NavbarLeft />
            <NavbarRight />
          </div>
          <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
            DATE CHANGE
          </h2>
          <div className="hidden lg:block">
            <NavbarRight />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div className="space-y-2">
            <label className="block">
              OPH Artist Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="contentId"
              value={ophid}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="block">
              Current Blocked Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="oldDate"
                value={formData.oldDate}
                disabled
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block">
             New Selected Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                name="newDate"
                value={formData.newDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split("T")[0]}
                onKeyDown={(e) => e.preventDefault()}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
                style={{
                  backgroundColor: newDateTaken
                    ? "rgba(255,0,0,0.1)"
                    : "transparent",
                  colorScheme: "dark",
                }}
              />
            </div>
            {checkingNewDate && (
              <span className="text-gray-400 text-sm">
                Checking availability…
              </span>
            )}
            {!checkingNewDate && newDateTaken && (
              <span className="text-red-500 text-sm">
                This date is taken by another artist. Please choose another
                date.
                <Link to="/dashboard/time-calendar">
                  <span className="underline ms-2">
                    Click to See Available Dates
                  </span>
                </Link>
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block">
             Reason for Change <span className="text-red-500">*</span>
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-cyan-400 min-h-[100px]"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing || checkingNewDate || newDateTaken}
            className="w-full bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors mt-8 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Change Date"}
          </button>
        </form>
      </div>
      <ToastContainer></ToastContainer>
    </div>
  );
}
