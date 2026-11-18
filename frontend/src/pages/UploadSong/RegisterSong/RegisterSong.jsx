import { ChevronDown } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axiosApi from "../../../conf/axios";
import getToken from "../../../utils/getToken";
import { useArtist } from "../../auth/API/ArtistContext";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bounce, ToastContainer } from "react-toastify";
import { toast } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import NavbarRight from "../../../components/Navbar/NavbarRight";
import NavbarLeft from "../../../components/Navbar/NavbarLeft";
import FilterSelect from "../../../components/FilterSelect/FilterSelect";

const REGISTER_SONG_STATE_KEY = "registerSongState";
const SONG_DATA_KEY = "songData"; // New key for storing song data in sessionStorage

/** Normalize API / form date values to YYYY-MM-DD (local calendar day). */
function bookingDateToYMD(value) {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  if (s.includes("/")) {
    const parts = s.split("/").map((p) => p.trim());
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (c.length === 4)
        return `${c}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
    }
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RegisterSongForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const [blockedDates, setBlockedDates] = useState([]); // Add state for blocked dates
  const [artistBlockedDates, setArtistBlockedDates] = useState([]); // Add state for blocked dates
  /** YYYY-MM-DD that /check-release-date-available last reported as taken for this artist */
  const [releaseDateTakenYmd, setReleaseDateTakenYmd] = useState(null);
  const [releaseDateCheckLoading, setReleaseDateCheckLoading] = useState(false);
  const releaseDateDebounceRef = useRef(null);
  const releaseDateCheckSeqRef = useRef(0);
  const [songReg, setSongReg] = useState(true);
  const [lyrical_services, setLyricalVid] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [payableAmount, setPayableAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [costingData, setCostingData] = useState([]);
  const [songRegAmount, setSongRegAmount] = useState(0);
  const [lyricalVideoAmount, setLyricalVideoAmount] = useState(0);
  const { headers, artist, user, ophid } = useArtist();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false); // Add state for success message
  const [agreement, setAgreement] = useState(false);
  const artistName = user?.userData.artist.name;
  const stageName = user?.userData.artist.stage_name;
  const [projectsType, setProjectsType] = useState("");
  const [videoType, setVideoType] = useState("");

  const projectType = localStorage.getItem("projectType");
  localStorage.setItem("projectType", projectType);
  const isUpdateReleaseDateOnly =
    location.state?.dateNoLongerAvailable === true && location.state?.song_id;
  const [formData, setFormData] = useState({
    oph_id: ophid,
    name: location.state?.songName || "",
    release_date: location.state?.release_date
      ? typeof location.state.release_date === "string" &&
        location.state.release_date.includes("-")
        ? location.state.release_date
        : ""
      : "",
    p_line: "",
    cp_line: "",
    song_reg: songReg,
    lyrical_services: location.state?.lyrical_services ?? lyrical_services,
    available_on_music_platforms: false,
    project_type: location.state?.project_type || projectType,
  });

  useEffect(() => {
    if (ophid) {
      setFormData((prev) => ({
        ...prev,
        oph_id: ophid,
      }));
    }
  }, [ophid]);

  useEffect(() => {
    if (location.state?.dateNoLongerAvailable && location.state?.song_id) {
      setFormData((prev) => ({
        ...prev,
        name: location.state.songName || prev.name,
        release_date: location.state.release_date
          ? String(location.state.release_date).includes("/")
            ? location.state.release_date.split("/").reverse().join("-")
            : String(location.state.release_date).slice(0, 10)
          : prev.release_date,
        lyrical_services:
          location.state.lyrical_services ?? prev.lyrical_services,
        project_type: location.state.project_type || prev.project_type,
      }));
    }
  }, [
    location.state?.dateNoLongerAvailable,
    location.state?.song_id,
    location.state?.songName,
    location.state?.release_date,
    location.state?.lyrical_services,
    location.state?.project_type,
  ]);

  const handleProjectTypeChange = (e) => {
    const { id, checked } = e.target;
    let newValue = "";

    if (checked) {
      // If checked, include the id
      if (projectsType) {
        newValue = `${projectsType} + ${id}`;
      } else {
        newValue = id;
      }
    } else {
      // If unchecked, remove it from string
      newValue = projectsType
        .split(" + ")
        .filter((val) => val !== id)
        .join(" + ");
    }

    setProjectsType(newValue);
  };

  const handleVideoTypeChange = (e) => {
    const { id, checked } = e.target;
    let newValue = "";

    if (checked) {
      if (videoType) {
        newValue = `${videoType} + ${id}`;
      } else {
        newValue = id;
      }
    } else {
      newValue = videoType
        .split(" + ")
        .filter((val) => val !== id)
        .join(" + ");
    }

    setVideoType(newValue);
  };

  // Function to fetch costing data
  const fetchCostingData = async () => {
    try {
      const response = await axiosApi.get("/get_costing", {
        headers: headers,
      });

      if (response.data.success) {
        const costingData = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];

        setCostingData(costingData);

        // Find Song Registration amount from costing table
        const songRegCost = costingData.find(
          (item) =>
            item.name && item.name.toLowerCase().includes("song registration"),
        );
        if (songRegCost) {
          setSongRegAmount(parseFloat(songRegCost.cost) || 0);
          console.log("Song Registration amount:", songRegCost.cost);
        }

        // Find Lyrics Service amount from costing table (paid-in-advance lyrical add-on)
        const lyricalVideoCost = costingData.find(
          (item) =>
            item.name && item.name.toLowerCase().includes("lyrics service"),
        );
        if (lyricalVideoCost) {
          setLyricalVideoAmount(parseFloat(lyricalVideoCost.cost) || 0);
          console.log("Lyrics Service amount:", lyricalVideoCost.cost);
        }

        console.log("All costing data:", costingData);
      }
    } catch (error) {
      console.error("Error fetching costing data:", error);
      // Keep default values if API fails
    }
  };

  const handleTotalPayment = () => {
    if (projectType === "paid in advance" && !lyrical_services) {
      setPayableAmount(0);
    } else if (projectType === "paid in advance" && lyrical_services) {
      setPayableAmount(lyricalVideoAmount);
    } else if (songReg && lyrical_services) {
      setPayableAmount(songRegAmount + lyricalVideoAmount);
    } else if (songReg && !lyrical_services) {
      setPayableAmount(songRegAmount);
    } else if (!songReg && lyrical_services) {
      setPayableAmount(lyricalVideoAmount);
    } else {
      setPayableAmount(0);
    }
  };

  useEffect(() => {
    handleTotalPayment();
  }, [songReg, lyrical_services, songRegAmount, lyricalVideoAmount]);

  // Fetch costing data on component mount
  useEffect(() => {
    fetchCostingData();
  }, []);

  // Modified useEffect to include blocked dates fetch
  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const response = await axiosApi.get("/bookings", {
          headers: headers,
        });

        if (response.data.success) {
          setIsLoading(false);
          const dates = (response.data.data || [])
            .map((item) => bookingDateToYMD(item.current_booking_date))
            .filter(Boolean);
          const seen = new Set();
          setBlockedDates(dates.filter((d) => !seen.has(d) && seen.add(d)));
        }
      } catch (error) {
        console.error("Error fetching blocked dates:", error);
      }
    };

    fetchBlockedDates();
  }, [headers]);

  useEffect(() => {
    const fetchBlockedDatesByOPHID = async () => {
      try {
        if (!ophid || !headers?.Authorization) return;

        const response = await axiosApi.get("/bookings-by-id", {
          headers: headers,
          params: { ophid },
        });

        if (response.data?.success && Array.isArray(response.data.data)) {
          setIsLoading(false);

          // Unused booked slots (song not attached yet); include original + changed dates from API
          const seen = new Set();
          const formattedDates = response.data.data
            .filter((item) => item.song_name === null || item.song_name === "")
            .map((item) => bookingDateToYMD(item.current_booking_date))
            .filter((d) => d && !seen.has(d) && seen.add(d));

          setArtistBlockedDates(formattedDates);
        }
      } catch (error) {
        console.error("Error fetching blocked dates by ophid", error);
      }
    };
    fetchBlockedDatesByOPHID();
  }, [ophid, headers]);

  const runReleaseDateAvailabilityCheck = useCallback(
    async (rawValue) => {
      const dateStr = bookingDateToYMD(rawValue);
      const seq = ++releaseDateCheckSeqRef.current;
      if (!dateStr || !ophid || !headers?.Authorization) {
        if (seq === releaseDateCheckSeqRef.current) {
          setReleaseDateTakenYmd(null);
          setReleaseDateCheckLoading(false);
        }
        return true;
      }
      setReleaseDateCheckLoading(true);
      try {
        const res = await axiosApi.get("/check-release-date-available", {
          headers,
          params: { release_date: dateStr, ophid },
        });
        if (seq !== releaseDateCheckSeqRef.current) {
          return true;
        }
        const available =
          res.data?.success === true && res.data?.available !== false;
        setReleaseDateTakenYmd(available ? null : dateStr);
        setReleaseDateCheckLoading(false);
        return available;
      } catch {
        if (seq !== releaseDateCheckSeqRef.current) {
          return true;
        }
        setReleaseDateTakenYmd(null);
        setReleaseDateCheckLoading(false);
        return true;
      }
    },
    [ophid, headers],
  );

  const scheduleReleaseDateAvailabilityCheck = useCallback(
    (rawValue) => {
      if (releaseDateDebounceRef.current) {
        clearTimeout(releaseDateDebounceRef.current);
      }
      const dateStr = bookingDateToYMD(rawValue);
      if (!dateStr) {
        setReleaseDateTakenYmd(null);
        setReleaseDateCheckLoading(false);
        return;
      }
      setReleaseDateCheckLoading(true);
      setReleaseDateTakenYmd(null);
      releaseDateDebounceRef.current = setTimeout(() => {
        runReleaseDateAvailabilityCheck(rawValue).then((available) => {
          if (!available) {
            toast.error(
              "This release date is already booked. Please choose another date.",
            );
          }
        });
      }, 350);
    },
    [runReleaseDateAvailabilityCheck],
  );

  useEffect(() => {
    return () => {
      if (releaseDateDebounceRef.current) {
        clearTimeout(releaseDateDebounceRef.current);
      }
    };
  }, []);

  // Modified useEffect to handle initial payment plan selection
  // useEffect(() => {
  //   if (!paymentPlans.length) return;

  //   const updatePaymentState = () => {
  //     if (projectType === "hybrid") {
  //       // For hybrid, select all plans and disable them
  //       const plan2 = paymentPlans.find((plan) => plan.id === 2);

  //       setSelectedPlans([plan2.id]);
  //       const amount = projectType === "advance" ? 0 : plan2.amount;
  //       setPayableAmount(amount);
  //     } else {
  //       // For new and advance, only select plan 2
  //       const plan2 = paymentPlans.find((plan) => plan.id === 2);
  //       if (plan2) {
  //         setSelectedPlans([plan2.id]);
  //         // For advance projects, set payable amount to 0 for plan 2
  //         const amount = projectType === "advance" ? 0 : plan2.amount;
  //         setPayableAmount(amount);
  //       }
  //     }
  //   };

  //   updatePaymentState();
  // }, [projectType, paymentPlans]);

  // const handlePaymentSelection = (plan) => {
  //   if (plan.isRequired || (projectType === "advance" && plan.id === 2)) return;

  //   setSelectedPlans((prev) => {
  //     const newSelection = prev.includes(plan.id)
  //       ? prev.filter((id) => id !== plan.id)
  //       : [...prev, plan.id];

  //     const newAmount = paymentPlans
  //       .filter((p) => {
  //         if (projectType === "advance" && p.id === 2) return false; // Waive off plan 2 for advance
  //         return p.isRequired || newSelection.includes(p.id);
  //       })
  //       .reduce((total, p) => total + p.amount, 0);

  //     setPayableAmount(newAmount);
  //     return newSelection;
  //   });
  // };
  const agreementHandler = () => {
    setAgreement(!agreement);
  };
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newFormData = {
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    };
    setFormData(newFormData);
    if (name === "release_date") {
      if (value) {
        scheduleReleaseDateAvailabilityCheck(value);
      } else {
        if (releaseDateDebounceRef.current) {
          clearTimeout(releaseDateDebounceRef.current);
        }
        setReleaseDateTakenYmd(null);
        setReleaseDateCheckLoading(false);
      }
    }
  };

  const isBlockedDate = (date) => {
    const formattedDate = bookingDateToYMD(date);
    if (!formattedDate) {
      return false;
    }
    if (releaseDateTakenYmd === formattedDate) {
      return true;
    }
    // Paid-in-advance artists pick from their own pre-booked calendar slots.
    if (
      projectType === "paid in advance" &&
      artistBlockedDates.includes(formattedDate)
    ) {
      return false;
    }
    if (blockedDates.length === 0) {
      return false;
    }
    return blockedDates.some(
      (blockedDate) =>
        blockedDate === formattedDate && formattedDate !== formData.oldDate,
    );
  };

  const newProject = async (updatedFormData) => {
    try {
      const response = await axiosApi.post(
        "/register-new-song",
        {
          oph_id: ophid,
          project_type: projectType,
          name: updatedFormData.name,
          release_date: updatedFormData.release_date,
          lyricalVid: updatedFormData.lyrical_services,
          next_step: updatedFormData.next_step,
          videoType: videoType,
        },
        { headers: headers },
      );

      if (response.data.success) {
        navigate(`/dashboard/upload-song/audio-metadata`, {
          state: {
            song_id: response.data.contentID,
            songName: updatedFormData.name,
            release_date: updatedFormData.release_date,
            project_type: projectType,
            lyrical_services: updatedFormData.lyrical_services,
          },
        });
      }
    } catch (error) {
      console.error("Error booking date", error);
      const msg = error?.response?.data?.message;
      if (error?.response?.status === 409) {
        toast.error(
          msg ||
            "This release date is no longer available. Please pick another date.",
        );
        const y = bookingDateToYMD(updatedFormData.release_date);
        if (y) setReleaseDateTakenYmd(y);
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Failed to register song. Please try again.");
      }
    }
  };

  const hybridProject = async (updatedFormData) => {
    try {
      const response = await axiosApi.post(
        "/register-hybrid-song",
        {
          oph_id: ophid,
          project_type: projectType,
          name: updatedFormData.name,
          release_date: updatedFormData.release_date,
          lyricalVid: updatedFormData.lyrical_services,
          available_on_music_platforms:
            updatedFormData.available_on_music_platforms,
          next_step: updatedFormData.next_step,
          projectsType: projectsType,
          videoType: videoType,
        },
        { headers: headers },
      );
      if (response.data.success) {
        navigate(`/dashboard/upload-song/audio-metadata`, {
          state: {
            song_id: response.data.contentID,
            songName: updatedFormData.name,
            release_date: updatedFormData.release_date,
            project_type: projectType,
            lyrical_services: updatedFormData.lyrical_services,
          },
        });
      }
    } catch (error) {
      console.error("Error booking date", error);
      const msg = error?.response?.data?.message;
      if (error?.response?.status === 409) {
        toast.error(
          msg ||
            "This release date is no longer available. Please pick another date.",
        );
        const y = bookingDateToYMD(updatedFormData.release_date);
        if (y) setReleaseDateTakenYmd(y);
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Failed to register song. Please try again.");
      }
    }
  };

  const paidInAdvance = async (updatedFormData) => {
    try {
      const response = await axiosApi.post(
        "/register-hybrid-song",
        {
          oph_id: ophid,
          project_type: projectType,
          name: updatedFormData.name,
          release_date: updatedFormData.release_date,
          lyricalVid: updatedFormData.lyrical_services,
          available_on_music_platforms:
            updatedFormData.available_on_music_platforms,
          next_step: updatedFormData.next_step,
          projectsType: projectsType,
          videoType: videoType,
        },
        { headers: headers },
      );
      console.log(response);
      if (response.data.success) {
        navigate(`/dashboard/upload-song/audio-metadata`, {
          state: {
            song_id: response.data.contentID,
            songName: updatedFormData.name,
            release_date: updatedFormData.release_date,
            project_type: projectType,
            lyrical_services: updatedFormData.lyrical_services,
          },
        });
      }
    } catch (error) {
      console.error("Error booking date", error);
      const msg = error?.response?.data?.message;
      if (error?.response?.status === 409) {
        toast.error(
          msg ||
            "This release date is no longer available. Please pick another date.",
        );
        const y = bookingDateToYMD(updatedFormData.release_date);
        if (y) setReleaseDateTakenYmd(y);
      } else if (msg) {
        toast.error(msg);
      } else {
        toast.error("Failed to register song. Please try again.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isUpdateReleaseDateOnly) {
      const newReleaseDate = formData.release_date;
      if (!newReleaseDate || String(newReleaseDate).trim() === "") {
        toast.error("Please select a new release date.");
        return;
      }
      const dateStr = String(newReleaseDate).includes("/")
        ? newReleaseDate.split("/").reverse().join("-")
        : String(newReleaseDate).slice(0, 10);
      if (releaseDateDebounceRef.current) {
        clearTimeout(releaseDateDebounceRef.current);
        releaseDateDebounceRef.current = null;
      }
      const dateOk = await runReleaseDateAvailabilityCheck(dateStr);
      if (!dateOk) {
        toast.error(
          "This release date is already booked. Please choose another date.",
        );
        return;
      }
      try {
        const res = await axiosApi.post(
          "/update-song-release-date",
          {
            song_id: location.state.song_id,
            oph_id: ophid,
            release_date: dateStr,
          },
          { headers },
        );
        if (res.data.success) {
          toast.success(
            "Release date updated. You can continue with your song.",
          );
          const returnToPage =
            location.state?.returnToPage ||
            "/dashboard/upload-song/audio-metadata";
          const nextState = {
            song_id: location.state.song_id,
            songName: location.state.songName || formData.name,
            release_date: dateStr,
            project_type: location.state?.project_type || projectType,
            lyrical_services:
              location.state?.lyrical_services ?? formData.lyrical_services,
          };
          if (location.state?.rejectedSections)
            nextState.rejectedSections = location.state.rejectedSections;
          if (location.state?.isFixingRejected != null)
            nextState.isFixingRejected = location.state.isFixingRejected;
          navigate(returnToPage, { state: nextState });
        } else {
          toast.error(res.data.message || "Failed to update release date.");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to update release date.",
        );
      }
      return;
    }

    if (!agreement) {
      toast.error("Please agree to the terms and conditions.");
      return;
    }

    // Validate video type selection
    if (
      !videoType ||
      (videoType !== "Music Video" && videoType !== "Lyrical Video")
    ) {
      toast.error("Please select either Music Video or Lyrical Video.");
      return;
    }

    const releaseYmd = bookingDateToYMD(formData.release_date);
    if (!releaseYmd) {
      toast.error("Please select a release date.");
      return;
    }
    if (releaseDateDebounceRef.current) {
      clearTimeout(releaseDateDebounceRef.current);
      releaseDateDebounceRef.current = null;
    }
    const releaseOk = await runReleaseDateAvailabilityCheck(
      formData.release_date,
    );
    if (!releaseOk) {
      toast.error(
        "This release date is already booked. Please choose another date before continuing.",
      );
      return;
    }

    // Correctly transform formData
    const updatedFormData = {
      ...formData,
      song_reg: songReg,
      lyrical_services: lyrical_services,
      cp_line: `${artistName} - ${stageName}`,
      p_line: `${artistName} - ${stageName}`,
      available_on_music_platforms:
        formData.available_on_music_platforms || false, // This line adds it
      next_step: "/dashboard/upload-song/audio-metadata/",
    };
    // console.log(updatedFormData, "updatedFormData");

    // Remove `c_line` and `isAvailableOnMusicPlatform`
    // const { c_line, ...payload } = updatedFormData;
    // delete updatedFormData.isAvailableOnMusicPlatform;

    if (projectType === "paid in advance") {
      paidInAdvance(updatedFormData);
    } else if (projectType === "new project") {
      newProject(updatedFormData);
    } else if (projectType === "hybrid project") {
      hybridProject(updatedFormData);
    }
    // if (updatedFormData.available_on_music_platforms) {
    //   toast.success("Song Registered Successfully !!!!");
    //   navigate(`/dashboard/upload-song/video-metadata/${response.data.data.id}`);
    //   return;
    // }

    // const plansNeedingPayment = selectedPlans;

    // if (payableAmount > 0 && plansNeedingPayment.length > 0) {
    //   const stateToSave = {
    //     formData: updatedFormData,
    //     selectedPlans,
    //     payableAmount,
    //   };
    //   sessionStorage.setItem(
    //     REGISTER_SONG_STATE_KEY,
    //     JSON.stringify(stateToSave)
    //   );

    //   await navigate("/dashboard/payment", {
    //     state: {
    //       artist_id: artist.id,
    //       amount: payableAmount,
    //       planIds: plansNeedingPayment,
    //       returnPath: "/dashboard/upload-song/register-song",
    //       heading: "Complete Payment",
    //     },
    //   });
    // } else {
    //   try {
    //     const response = await axiosApi.post("/content/initial", payload, {
    //       headers: headers,
    //     });
    //     if (response.data.success) {
    //       navigate(
    //         `/dashboard/upload-song/audio-metadata/${response.data.data.id}`,
    //         {
    //           state: { projectType },
    //         }
    //       );
    //       return;
    //     }
    //   } catch (error) {
    //     console.error("Error registering song:", error);
    //     toast.error("Failed to register song. Please try again.");
    //   }
    // }
  };

  // const handleContentCreation = async (paymentData) => {
  //   // Add a flag in sessionStorage to prevent double submission
  //   const isSubmitting = sessionStorage.getItem("isSubmitting");
  //   if (isSubmitting) return;

  //   try {
  //     sessionStorage.setItem("isSubmitting", "true");
  //     const token = getToken();

  //     // Get form data either from saved state or current state
  //     let contentFormData = formData;

  //     // If we're coming back from the payment screen, use saved state
  //     if (paymentData.newPaymentIds?.length > 0) {
  //       const savedState = sessionStorage.getItem(REGISTER_SONG_STATE_KEY);
  //       if (savedState) {
  //         const parsedState = JSON.parse(savedState);
  //         contentFormData = parsedState.formData;
  //       }
  //     }

  //     // Remove agreement from form data
  //     const { agreement, ...contentDataWithoutAgreement } = contentFormData;

  //     // Set payment_ids based on project type
  //     const paymentIds =
  //       projectType === "paid in advance"
  //         ? ["0"] // For "Paid in Advance", include null as a placeholder
  //         : [...(paymentData.newPaymentIds || [])];

  //     const contentData = {
  //       ...contentDataWithoutAgreement,
  //       payment_ids: paymentIds,
  //       project_type: projectType,
  //     };

  //     console.log("Submitting content data:", contentData);

  //     const response = await axiosApi.post("/content/initial", contentData, {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //       },
  //     });

  //     if (response.data.success) {
  //       // Store song data in sessionStorage instead of Redux
  //       const songData = {
  //         contentID: response.data.data.id,
  //         name: response.data.data.name,
  //       };
  //       sessionStorage.setItem(SONG_DATA_KEY, JSON.stringify(songData));

  //       // Clean up register song state
  //       sessionStorage.removeItem(REGISTER_SONG_STATE_KEY);
  //       sessionStorage.removeItem("isSubmitting");
  //       console.log(
  //         response.data.data.available_on_music_platforms,
  //         "response.data"
  //       );
  //       if (response.data.data.available_on_music_platforms) {
  //         navigate(
  //           `/dashboard/upload-song/video-metadata/${response.data.data.id}`,
  //           { state: { projectType } }
  //         );
  //       } else {
  //         navigate(
  //           `/dashboard/upload-song/audio-metadata/${response.data.data.id}`,
  //           { state: { projectType } }
  //         );
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error creating content:", error);
  //     alert("Failed to create content. Please try again.");
  //   } finally {
  //     // Clean up the submission flag in case of error
  //     sessionStorage.removeItem("isSubmitting");
  //   }
  // };

  // Modify the release date input field based on project type
  const renderReleaseDateField = () => {
    if (projectType === "paid in advance") {
      return (
        <div className="space-y-2">
          <label className="block">
            Select & Block Release Date <span className="text-red-500">*</span>
          </label>
          {/* <select
            name="release_date"
            value={formData.release_date}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            required
          >
            <option value="">Select a blocked date</option>
            {artistBlockedDates.map((date) => (
              <option
                key={new Date(date).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
                value={date}
              >
                {new Date(date).toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}
              </option>
            ))}
          </select> */}

          <FilterSelect
            value={formData.release_date}
            placeholder="Select a blocked date"
            ariaLabel="Blocked Date"
            options={artistBlockedDates.map((date) => {
              const formattedDate = new Date(date).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
              });

              return {
                value: formattedDate,
                label: formattedDate,
              };
            })}
            onChange={(value) => {
              setFormData((prev) => ({
                ...prev,
                release_date: value,
              }));
            }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="block">
          Select & Block Release Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          name="release_date"
          value={formData.release_date}
          onChange={handleChange}
          className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
          required
          min={new Date().toISOString().split("T")[0]}
          onKeyDown={(e) => e.preventDefault()}
          style={{
            backgroundColor: isBlockedDate(formData.release_date)
              ? "rgba(255,0,0,0.1)"
              : "transparent",
            colorScheme: "dark",
          }}
        />
        {releaseDateCheckLoading && formData.release_date && (
          <span className="text-gray-400 text-sm">
            Checking date availability…
          </span>
        )}
        {isBlockedDate(formData.release_date) && (
          <span className="text-red-500 text-sm">
            This date is not available (already on the release calendar). Please
            choose another date.
            <Link to={"/dashboard/time-calendar"}>
              <span className="underline ms-2">View calendar</span>
            </Link>
          </span>
        )}
      </div>
    );
  };

  // Add loading screen
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-70px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:px-8 lg:p-6">
      {showSuccessMessage ? (
        <div className="min-h-[calc(100vh-70px)] bg-opacity-70 z-10 text-white flex flex-col items-center justify-center p-6">
          <div className="text-center flex justify-center items-center flex-col space-y-6">
            {/* Icon with animation */}
            <img src={Review} className="w-[100px]" alt="Review" />

            {/* Title */}
            <h1 className="text-cyan-400 text-xl font-extrabold mb-4 drop-shadow-[0_0_15px_rgba(34,211,238,1)] tracking-wider">
              YOUR SONG HAS BEEN REGISTERED SUCCESSFULLY
            </h1>

            {/* Back to Home Button */}
            <button
              onClick={() => navigate("/dashboard/upload-song")}
              className="mt-8 z-[1000] px-16 py-3 bg-[#5DC9DE] hover:font-bold hover:cursor-pointer text-black rounded-full font-medium transition-colors duration-200"
            >
              Go to Song Registration Page
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full">
          <div className="flex justify-between flex-col lg:flex-row mb-8">
            <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
              <NavbarLeft />
              <NavbarRight />
            </div>
            <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
              {isUpdateReleaseDateOnly
                ? "UPDATE RELEASE DATE"
                : "REGISTER YOUR SONG"}
            </h2>
            <div className="hidden lg:block">
              <NavbarRight />
            </div>
          </div>
          {isUpdateReleaseDateOnly && (
            <div className="mb-6 p-4 rounded-lg bg-amber-900/30 border border-amber-500/50 text-amber-200">
              <p className="font-medium">
                The release date you selected is no longer available.
              </p>
              <p className="text-sm mt-1">
                Please select a new release date for this song to continue.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
            {/* Song Name */}
            <div className="space-y-2">
              <label className="block">
                Song Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="We Are The Best"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
                required
                disabled={!!location.state?.songName || isUpdateReleaseDateOnly}
              />
            </div>

            {/* Project Type (only shown when paid in advance) */}
            {projectType === "paid in advance" && (
              <div className="space-y-2">
                <label className="block">
                  Project Type: <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <div className="flex gap-2">
                    <input
                      type="radio"
                      name="projectTypeRadio"
                      value="New"
                      onChange={() => setProjectsType("New")}
                      checked={projectsType === "New"}
                    />
                    <label htmlFor="New">New</label>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="radio"
                      name="projectTypeRadio"
                      value="Hybrid"
                      onChange={() => setProjectsType("Hybrid")}
                      checked={projectsType === "Hybrid"}
                    />
                    <label htmlFor="Hybrid">Hybrid</label>
                  </div>
                </div>
              </div>
            )}

            {/* Video Type */}
            <div className="space-y-2 mb-2">
              <label className="block">
                Music video or lyrical video
                <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-4">
                <div className="flex gap-2">
                  <input
                    type="radio"
                    name="videoTypeRadio"
                    value="Music Video"
                    onChange={() => setVideoType("Music Video")}
                    checked={videoType === "Music Video"}
                  />
                  <label htmlFor="Music Video">Music Video</label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="radio"
                    name="videoTypeRadio"
                    value="Lyrical Video"
                    onChange={() => setVideoType("Lyrical Video")}
                    checked={videoType === "Lyrical Video"}
                  />
                  <label htmlFor="Lyrical Video">Lyrical Video</label>
                </div>
              </div>
            </div>

            {/* Toggle Button for Hybrid Projects */}
            {projectType !== "new project" && (
              <div className="space-y-2">
                <span className="text-gray-400">
                  *Please confirm whether this song is already available on any music platform, or the beats used is a Free-for-Profit Beats.{" "}
                </span>
                <label className="block">
                  Select the Answer that Applies to the Song:
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="available_on_music_platforms"
                      value="yes"
                      checked={formData.available_on_music_platforms === true}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          available_on_music_platforms: true,
                        })
                      }
                      className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="available_on_music_platforms"
                      value="no"
                      checked={formData.available_on_music_platforms === false}
                      onChange={() =>
                        setFormData({
                          ...formData,
                          available_on_music_platforms: false,
                        })
                      }
                      className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            )}

            <>
              {/* Release Date */}
              {renderReleaseDateField()}

              {/* C-Line */}
              <div className="space-y-2">
                <label className="block">
                  CP-Line <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cp_line"
                    placeholder="We Are The Best"
                    value={`${artistName} - ${stageName}`}
                    onChange={handleChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* P-line */}
              <div className="space-y-2">
                <label className="block">
                  P-line <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="p_line"
                    placeholder="We Are The Best"
                    value={`${artistName} - ${stageName}`}
                    onChange={handleChange}
                    className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              </div>

              {/* Payment Plans */}
              {/* <div className="space-y-2">
                <label className="block">Payment Plans:</label>
                {paymentPlans.map((plan) => {
                  const isAdvance = projectType === "advance";
                  const isPlan2 = plan.id === 2;
                  const isPaidInAdvance = isAdvance && isPlan2;

                  return (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPlans.includes(plan.id)}
                          onChange={() => handlePaymentSelection(plan)}
                          disabled={plan.isRequired}
                          className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400"
                        />
                        <span>{plan.name}</span>
                        {isPaidInAdvance ? (
                          <span className="text-xs text-cyan-400">
                            (Paid in Advance)
                          </span>
                        ) : (
                          plan.isRequired && (
                            <span className="text-xs text-cyan-400">
                              (Required)
                            </span>
                          )
                        )}
                      </label>
                      <span
                        className={
                          isPaidInAdvance ? "line-through text-gray-500" : ""
                        }
                      >
                        ₹{isPaidInAdvance ? 0 : plan.amount}
                      </span>
                    </div>
                  );
                })}
              </div> */}

              <div className="space-y-2">
                <label className="block">Payment Plans:</label>
                {projectType !== "paid in advance" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={songReg}
                        onChange={() => setSongReg(!songReg)}
                        className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400"
                        disabled={songReg}
                      />
                      <span>{songRegAmount} - Song Registration fees </span>
                    </label>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={lyrical_services}
                      onChange={() => setLyricalVid(!lyrical_services)}
                      className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400"
                    />
                    <span>{lyricalVideoAmount} - Lyrical Video </span>
                  </label>
                </div>
              </div>
            </>

            {/* Agreement */}
            <div className="space-y-2">
              <label className="block">Agreement:</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="agreement"
                  checked={agreement}
                  onChange={agreementHandler}
                  className="text-cyan-400 bg-gray-800 border-gray-700 focus:ring-cyan-400 rounded"
                />
                <span>I have Read and Agree to the Terms & Conditions</span>
              </label>
            </div>

            {/* Payable Amount */}
            <div className="flex justify-between items-center pt-4">
              <span>Payable Amount</span>
              <span className="text-cyan-400 text-xl font-bold">
                ₹{payableAmount}/-
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                releaseDateCheckLoading ||
                isBlockedDate(formData.release_date) ||
                (!isUpdateReleaseDateOnly && !agreement)
              }
              className="w-full bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdateReleaseDateOnly
                ? "Update release date & continue"
                : "Continue"}
            </button>
          </form>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}
