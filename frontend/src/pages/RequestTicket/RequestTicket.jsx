import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Upload } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import getToken from "../../utils/getToken";
import axiosApi from "../../conf/axios";
import toast from "react-hot-toast";
import { useArtist } from "../auth/API/ArtistContext";
import axios from "axios";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";
import FilterSelect from "../../components/FilterSelect/FilterSelect";

const TICKET_KEY = "ticket_state";
const STATUS_MAP = {
  Submitted: "Submitted",
  Resolved: "Resolved",
};

export default function RequestTicketForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { headers, artist } = useArtist();
  const { ophid, user } = useArtist();
  const [ticketCategories, setTicketCategories] = useState([]);
  const [allPlans, setAllPlans] = useState([]);
  const [ticketPlan, setTicketPlan] = useState([]);
  const [amount, setAmount] = useState(null);
  const [tickets, setTickets] = useState([]);
  const oph_id = useSelector((state) => state.profile.profile);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef(new AbortController());
  const isSubmittingRef = useRef(false);
  const fetchPaymentPlans = async () => {
    try {
      const response = await axiosApi.get("/payments/plans", {
        headers: headers,
        signal: abortControllerRef.current.signal,
      });
      setAllPlans(response.data.data);
      const supportPlan = response.data.data.find(
        (plan) => plan.name === "Support Ticket",
      );
      if (supportPlan) {
        setTicketPlan([supportPlan.id]);
        setAmount(supportPlan.amount);
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      console.log("Name:", user?.userData?.artist?.name);
      console.log("Email:", user?.email);
    }
  }, [user]);

  // const fetchTicketCategories = async () => {
  //   try {
  //     const response = await axiosApi.get("/ticket/ticket-categories", {
  //       headers: headers,
  //       signal: abortControllerRef.current.signal,
  //     });
  //     setTicketCategories(response.data.categories[0]);
  //     console.log(response.data.categories,"categories")
  //   } catch (err) {
  //     if (!axios.isCancel(err)) {
  //       console.log(err);
  //     }
  //   }
  // };
  const ticketNumber = `${Math.floor(1000 + Math.random() * 9000)}`;
  const fetchTicketCategories = () => {
    const testCategories = [
      { id: "1", name: "General Enquiry " },
      { id: "2", name: "Related to Profile" },
      { id: "3", name: "Song Registration/Calendar" },
      { id: "4", name: "Leaderboard/KPI Questions" },
      { id: "5", name: "Events" },
      { id: "6", name: "Change Bank Account" },
      { id: "6", name: "Income Enquiry" },
      { id: "6", name: "Feature Request" },
      { id: "6", name: "Partnership & Business" },
      { id: "6", name: "Feedback & Suggestions" },
      { id: "6", name: "Technical Issue/Bug" },
      { id: "6", name: "Others" },
    ];


    setTicketCategories(testCategories);
  };

  const [formData, setFormData] = useState({
    category: "",
    subject: "",
    description: "",
    attachments: [],
  });

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      setFormData((prev) => ({
        ...prev,
        attachments: Array.from(files), // Save File objects directly
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  useEffect(() => {
    const fetchTickets = async () => {
      if (!ophid) return;

      try {
        const response = await axiosApi.get(`/getAllTickets?ophID=${ophid}`);
        console.log("Response", response.data.data);

        const sanitized = response.data.data.map((ticket) => {
          let parsedImages = [];

          try {
            // Try to parse JSON safely
            if (
              typeof ticket.imageURL === "string" &&
              ticket.imageURL.trim() !== ""
            ) {
              parsedImages = JSON.parse(ticket.imageURL);

              // If it’s a single string (not array), convert it into array
              if (typeof parsedImages === "string") {
                parsedImages = [parsedImages];
              }

              // If parsed value isn’t array (like null or object), fallback to []
              if (!Array.isArray(parsedImages)) {
                parsedImages = [];
              }
            }
          } catch (err) {
            console.warn("Error parsing imageURL:", ticket.imageURL, err);
            parsedImages = [];
          }

          return {
            ...ticket,
            imageURL: parsedImages,
          };
        });

        setTickets(sanitized);
      } catch (err) {
        console.error("Failed to fetch tickets:", err);
      }
    };

    fetchTickets();
  }, [ophid]);

  const submitTicket = async (formData) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const formDataObj = new FormData();
    try {
      formDataObj.append("category", formData.category);
      formDataObj.append("description", formData.description);
      formDataObj.append("subject", formData.subject);
      formDataObj.append("ophID", ophid || ""); // Already available from Redux
      formDataObj.append("name", user?.userData?.artist?.name || "");
      formDataObj.append("email", user?.email || "");
      formDataObj.append("ticketNumber", ticketNumber);

      formData.attachments.forEach((file) => {
        formDataObj.append("attachment", file);
      });

      const response = await axiosApi.post("/sendTicket", formDataObj, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data",
        },
      });
      console.log(response);

      if (response.status === 201) {
        // Clear form after submission (keep this part)
        setFormData({
          category: "",
          description: "",
          subject: "",
          attachments: [],
        });

        // Don't navigate to success page here - this is now handled in the calling functions
        // The payment flow will navigate to success after successful submission
        // The general enquiry flow navigates to success directly

        // Just clear state and refresh tickets
        if (location.state) {
          navigate("/dashboard/request-ticket", { replace: true });
        }
      }
    } catch (error) {
      toast.error("Ticket Submission Failed");
      console.log(formDataObj);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Testing for submit");
    // Validate required fields
    if (!formData.category || !formData.subject || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitTicket(formData, null); // null payment_id for free tickets

      // Navigate to success page instead of showing toast
      navigate("/dashboard/success", {
        state: {
          heading: "Your request ticket has been successfully generated!",
          btnText: "View Requests",
          redirectTo: "/dashboard/request-ticket",
        },
        replace: true,
      });

      // Clear form data from session storage
    } catch (error) {
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
    // } else {
    //   // Navigate to payment page
    //   await navigate("/dashboard/payment", {
    //     state: {
    //       artist_id: artist.id,
    //       amount: amount,
    //       planIds: ticketPlan,
    //       returnPath: "/dashboard/request-ticket",
    //       heading: "Complete Ticket Payment",
    //       showSuccessToast: true,
    //       successMessage: "Ticket submitted successfully!",
    //     },
    //   });
    // }
  };

  // const handleContentCreation = async (paymentData) => {
  //   if (isSubmittingRef.current) return;
  //   try {
  //     const savedState = sessionStorage.getItem(TICKET_KEY);
  //     if (!savedState) return;

  //     const contentFormData = JSON.parse(savedState);
  //     await submitTicket(contentFormData, paymentData.newPaymentIds[0]);

  //     sessionStorage.removeItem(TICKET_KEY);
  //   } catch (error) {
  //     console.error("Error creating content:", error);
  //     toast.error("Failed to create content. Please try again.");
  //   }
  // };

  // useEffect(() => {
  //   const paymentResult = location.state;
  //   if (paymentResult?.status === "success" && !isSubmittingRef.current) {
  //     const controller = new AbortController();

  //     // Handle the payment return and ticket creation
  //     (async () => {
  //       try {
  //         await handleContentCreation(paymentResult.paymentData);

  //         // Show toast notification after successful ticket creation
  //         if (paymentResult.showSuccessToast && paymentResult.successMessage) {
  //           toast.success(paymentResult.successMessage, {
  //             duration: 4000,
  //             position: "top-right",
  //           });
  //         }

  //         // Clear location state to prevent duplicate processing
  //         navigate("/dashboard/request-ticket", { replace: true });
  //       } catch (error) {
  //         console.error("Error processing payment return:", error);
  //       }
  //     })();

  //     return () => {
  //       controller.abort();
  //     };
  //   }
  // }, [location.state]);

  useEffect(() => {
    fetchTicketCategories();
  }, []);

  return (
    <div className="min-h-[calc(100vh-70px)] text-gray-100 px-[16px] py-[16px] lg:px-6 lg:p-6">
      <div className="w-full">
        <div className="flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
          <NavbarLeft />
          <NavbarRight />
        </div>
        <div className="flex justify-between items-center mb-[16px] mb-8">
          <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
            REQUEST TICKET
          </h2>
          <div className="hidden lg:block">
            <NavbarRight />
          </div>
        </div>

        {/* Submitted Requests List */}
        <div className="px-0 mb-[24px] lg:p-4 lg:mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Submitted Requests:</h2>
          {tickets?.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex justify-between items-center p-3 bg-gray-800/30 rounded-lg ${
                    ticket.status === 0
                      ? "border-t-2 border-yellow-200"
                      : ticket.status === 1
                        ? "border-t-2 border-green-200"
                        : "border-t-2 border-red-200"
                  }`}
                >
                  <div>
                    <p className="text-m text-cyan-400">
                      {ticket.subject.substring(0, 50)}...
                    </p>
                    <p className="text-m text-cyan-400">
                      {ticket.description.substring(0, 50)}...
                    </p>
                    <p className="text-sm">{ticket.category}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      ticket.status == "Resolved"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {STATUS_MAP[ticket.status]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No submitted requests yet</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-full lg:max-w-xl">
          {/* Profile Code */}
          <div className="space-y-2">
            <label className="block">
              OPH Artist Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="profileCode"
              value={ophid}
              onChange={handleChange}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-cyan-400"
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="block">
              Request Category<span className="text-red-500">*</span>
            </label>
            <FilterSelect
              value={formData.category}
              placeholder="Select Category"
              ariaLabel="Category"
              options={ticketCategories.map((cat) => ({ value: cat.name, label: cat.name }))}
              onChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
            />
          </div>

          <div className="space-y-2">
            <label className="block">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter subject..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block">
              Describe Your Concern <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Write Description......"
              rows={4}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          {/* Subject */}

          {/* File Upload */}
          <div className="space-y-2">
            <label
              htmlFor="file-upload"
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-gray-400">
                Upload Any Image Attachment (Optional)
              </span>
            </label>
            <input
              type="file"
              name="attachments"
              id="file-upload" // Make sure this ID matches the htmlFor above
              onChange={handleChange}
              accept=".jpg,.jpeg,.png,.pdf"
              multiple={true} // Allow multiple file uploads
              className="hidden"
            />
            {formData.attachments.length > 0 && (
              <div className="text-sm text-cyan-400">
                Selected files:{" "}
                {formData.attachments.map((file) => file.name).join(", ")}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Request Ticket"}
          </button>
        </form>
      </div>
    </div>
  );
}
