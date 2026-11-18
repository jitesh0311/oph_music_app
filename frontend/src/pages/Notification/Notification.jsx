import React, { useEffect, useState } from "react";
import axiosApi from "../../conf/axios";
import { useArtist } from "../auth/API/ArtistContext";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import Noti from "../../../public/assets/images/noti.png";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

const Notification = () => {
  const { headers, ophid, setHasNewNotification } = useArtist();
  const [notifications, setNotifications] = useState([]);

  const formatTitle = (title) => {
    let newTitle = "";

    if (
      title.toLowerCase().includes("payment approved for song registration")
    ) {
      newTitle = "Yeah! Payment Approved for Song Registration. 🎉";
    } else if (
      title.toLowerCase().includes("payment rejected for song registration")
    ) {
      newTitle =
        "Payment Rejected for Song Registration. Don’t Worry. Check Your Mail.";
    } else if (title.toLowerCase().includes("audio has been approved for")) {
      const formattedStr = title.slice(27);

      newTitle = `You Did It ! Song Details Passed. Audio has been Approved for ${formattedStr}`;
    } else if (title.toLowerCase().includes("audio has been rejected for")) {
      const match = title.match(/for\s*(.*)$/);

      newTitle = `Audio has been Rejected for ${match[1]}. Check the Reason and Resubmit.`;
    } else if (
      title.toLowerCase().includes("video has been approved for")
    ) {
      newTitle =
        "Great News ! Video Details Passed. Video has been Approved for Your Song. 🎉";
    } else if (
      title.toLowerCase().includes("video has been rejected for your song")
    ) {
      newTitle =
        "Video has been Rejected for Your Song Check the Reason and Resubmit.";
    } else if (title.toLowerCase().includes("date booking approved:")) {
      const slicedStr = title.slice(23);

      newTitle = `Date ${slicedStr} Booking is Confirmed ! 📅`;
    } else if (title.toLowerCase().includes("date booking rejected:")) {
      const slicedStr = title.slice(23);

      newTitle = `Date Booking is Rejected: ${slicedStr}`;
    } else if (
      title.toLowerCase().includes("event") &&
      title.toLowerCase().includes("registration approved")
    ) {
      const eventName =
        title.match(/Event\s+"(.*?)"\s+Registration/)?.[1] || "";

      newTitle = `Event “${eventName}” Registration Approved ! 🎉`;
    } else if (
      title.toLowerCase().includes("event") &&
      title.toLowerCase().includes("registration rejected")
    ) {
      const eventName =
        title.match(/Event\s+"(.*?)"\s+Registration/)?.[1] || "";

      newTitle = `Event “${eventName}” Registration Rejected.`;
    } else if (
      title.toLowerCase().includes("tv publishing") &&
      title.toLowerCase().includes("unlocked")
    ) {
      const eventName =
        title.match(/Publishing\s+"(.*?)"\s+Unlocked/)?.[1] || "";

      newTitle = `TV Publishing “${eventName}” Content is Unlocked! 📺`;
    } else if (
      title.toLowerCase().includes("tv publishing") &&
      title.toLowerCase().includes("accepted")
    ) {
      const eventName =
        title.match(/Publishing\s+"(.*?)"\s+Accepted/)?.[1] || "";

      newTitle = `TV Publishing “${eventName}” Content is Approved! 🎉`;
    } else if (
      title.toLowerCase().includes("tv publishing") &&
      title.toLowerCase().includes("rejected")
    ) {
      const eventName =
        title.match(/Publishing\s+"(.*?)"\s+Rejected/)?.[1] || "";

      newTitle = `TV Publishing “${eventName}” Content is Rejected!`;
    } else if (
      title.toLowerCase().includes("your user profile has been updated")
    ) {
      newTitle = `Your User Profile Has Been Updated! ✒️`;
    } else if (title.toLowerCase().includes("ticket updated")) {
      newTitle = `Ticket Raised Resolved Successfully 🎟️`;
    } else if (
      title
        .toLowerCase()
        .includes("payment approved for special artist song registration")
    ) {
      newTitle = `Great News ! Payment Approved for Your Profile Song Registration 📌`;
    } else if (
      title
        .toLowerCase()
        .includes("payment rejected for special artist song registration")
    ) {
      newTitle = `Payment Rejected for Your Profile Song Registration`;
    } else if (
      title.toLowerCase().includes("your personal profile has been updated")
    ) {
      newTitle = `Your Personal Profile Has Been Updated! ✒️`;
    } else if (
      title.toLowerCase().includes("your professional profile has been updated")
    ) {
      newTitle = `Your Professional Profile Has Been Updated! ✒️`;
    } else if (
      title
        .toLowerCase()
        .includes("your documentation has been updated")
    ) {
      newTitle = `Your Documentation Profile Has Been Updated! ✒️`;
    }
    else {
      newTitle = title;
    }

    return newTitle;
  };

  const formatMessage = (message) => {
    console.log(message);

    let newMessage = "";

    if (
      message.toLowerCase().includes("has been approved for song registration")
    ) {
      newMessage =
        "First step done. Your song registration is now successfully processed.";
    } else if (
      message.toLowerCase().includes("has been rejected for song registration")
    ) {
      let newMessageArr = message.split(" ");
      const match = message.match(/to\s*(.*)$/);

      newMessage = `Payment Update: Your song registration payment was rejected. Transaction ID: ${newMessageArr[5]}. Reason: ${match[1]}`;
    } else if (
      message.toLowerCase().includes("audio for your song") &&
      message.toLowerCase().includes("was approved")
    ) {
      newMessage = "Another step closer to sharing your music with the world.";
    } else if (
      message.toLowerCase().includes("audio of your song") &&
      message.toLowerCase().includes("was rejected due to")
    ) {
      const messageArr = message.split(" ");
      const match = message.match(/to\s*(.*)$/);

      newMessage = `Audio Update: Audio of your song ${messageArr[4]} was rejected due to ${match[1]}`;
    } else if (
      message
        .toLowerCase()
        .includes("video for your song")
    ) {
      newMessage = "Your music journey just got another green light.";
    } else if (
      message
        .toLowerCase()
        .includes("video of your song your song was rejected due to")
    ) {
      const match = message.match(/to\s*(.*)$/);

      newMessage = `Video Update: Video of your song was rejected due to: ${match[1]}`;
    } else if (
      message.toLowerCase().includes("your date booking for") &&
      message.toLowerCase().includes("has been approved")
    ) {
      newMessage =
        "Your date has been successfully approved. Your special date is officially locked in!";
    } else if (
      message.toLowerCase().includes("your date booking for") &&
      message.toLowerCase().includes("has been rejected:")
    ) {
      const match = message.match(/rejected:\s*(.*)$/);
      console.log(match);

      newMessage = `Your date booking for has been rejected due to: ${match[1]}. Don’t worry. Check your mail.`;
    } else if (
      message.toLowerCase().includes("your registration for") &&
      message.toLowerCase().includes("has been approved. you're all set!")
    ) {
      newMessage = `You’re In! Your registration for this event has been approved. Get ready for an amazing experience!`;
    } else if (
      message.toLowerCase().includes("your registration for") &&
      message.toLowerCase().includes("has been rejected")
    ) {
      const match = message.match(/rejected:\s*(.*)$/);

      newMessage = `Your registration for this event has been rejected due to: ${match[1]}`;
    } else if (
      message.toLowerCase().includes("your tv publishing content for") &&
      message.toLowerCase().includes("has been unlocked by admin.")
    ) {
      const eventName = message.match(/for\s+"(.*?)"\s+has/)?.[1] || "";

      newMessage = `Your TV publishing content “${eventName}” is eligible and ready for the next step.`;
    } else if (
      message.toLowerCase().includes("your tv publishing content for") &&
      message.toLowerCase().includes("has been accepted by admin.")
    ) {
      const eventName = message.match(/for\s+"(.*?)"\s+has/)?.[1] || "";

      newMessage = `Your TV publishing content “${eventName}” has reviewed and accepted by the Admin.`;
    } else if (
      message.toLowerCase().includes("your tv publishing content for") &&
      message.toLowerCase().includes("has been rejected by admin.")
    ) {
      const eventName = message.match(/for\s+"(.*?)"\s+has/)?.[1] || "";

      newMessage = `Your TV publishing content “${eventName}” is rejected and read the review feedback.`;
    } else if (
      message
        .toLowerCase()
        .includes(
          "your profile details have been successfully updated by admin.",
        )
    ) {
      newMessage = `Your profile details have been successfully updated by our admin team.`;
    } else if (
      message.toLowerCase().includes("ticket") &&
      message.toLowerCase().includes("was updated with a resolution.")
    ) {
      const eventName = message.match(/Ticket\s+(.*?)\s+was/)?.[1] || "";

      newMessage = `Ticket ${eventName} has been updated with a resolution.`;
    } else if (
      message.toLowerCase().includes("your payment with transaction id") &&
      message
        .toLowerCase()
        .includes("has been approved for special artist song registration.")
    ) {
      newMessage = `Your payment for the Profile Song Registration has been approved.`;
    } else if (
      message.toLowerCase().includes("your payment with transaction id") &&
      message
        .toLowerCase()
        .includes(
          "has been rejected for special artist song registration due to not proper.",
        )
    ) {
      const eventName = message.match(/ID:\s+(.*?)\s+has/)?.[1] || "";
      newMessage = `Your payment could not be approved for the Profile Song Registration with Transaction ID: ${eventName}`;
    } else if (
      message
        .toLowerCase()
        .includes(
          "your personal details have been successfully updated by admin.",
        )
    ) {
      newMessage = `Your profile details have been updated by our Admin Team in accordance with your submitted request or an administrative decision, as applicable, and in compliance with the applicable Terms & Conditions (T&C).`;
    } else if (
      message
        .toLowerCase()
        .includes(
          "your professional details have been successfully updated by admin.",
        )
    ) {
      newMessage = `Your profile details have been updated by our Admin Team in accordance with your submitted request or an administrative decision, as applicable, and in compliance with the applicable Terms & Conditions (T&C).`;
    } else if (
      message
        .toLowerCase()
        .includes(
          "your documentation details have been successfully updated by admin.",
        )
    ) {
      newMessage = `Your profile details have been updated by our Admin Team in accordance with your submitted request or an administrative decision, as applicable, and in compliance with the applicable Terms & Conditions (T&C).`;
    }
    else{
      newMessage = message;
    }

    return newMessage;
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!ophid) return;
      try {
        const { data } = await axiosApi.get(`/notification/${ophid}`, {
          headers,
        });

        console.log(data);

        setNotifications(data);
        // user has viewed notifications page; clear red dot
        setHasNewNotification(false);
        localStorage.removeItem("hasNewNotification");
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotifications();
  }, [ophid, headers, setHasNewNotification]);

  const handleNotificationClick = async (note) => {
    if (note.read_status) {
      if (note.link) window.open(note.link, "_blank");
      return;
    }

    try {
      await axiosApi.put(`/notification/${note.id}/read`, {}, { headers });

      setNotifications((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, read_status: true } : n)),
      );

      // if (note.link) window.open(note.link, "_blank");
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const NotificationItem = ({ note }) => {
    const navigate = useNavigate();

    const handleClick = (e) => {
      e.stopPropagation();
      if (!note.link) return;

      // Ensure link starts with /dashboard
      // const linkTo = note.link.startsWith("/dashboard") ? note.link : note.link;

      navigate(`${note.link}`);
    };

    return (
      <div
        onClick={() => handleNotificationClick(note)}
        className={`flex gap-4 p-4 border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer ${
          !note.read_status ? "bg-[#1e293b]" : ""
        }`}
      >
        <div className="flex-shrink-0">
          <div className="w-12 h-12 p-2 bg-cyan-950 rounded-lg flex items-center justify-center">
            <img src={Noti} alt="notification icon" />
          </div>
        </div>
        <div className="flex flex-col justify-center">
          {/* <h3 className="text-white font-medium mb-1">{note.title}</h3>
          <p className="text-gray-400 text-sm">{note.message}</p> */}
          <h3 className="text-white font-medium mb-1">
            {formatTitle(note.title)}
          </h3>
          <p className="text-gray-400 text-sm">{formatMessage(note.message)}</p> 

          {note.link && (
            <span
              onClick={handleClick}
              className="text-cyan-400 text-xs mt-2 hover:text-cyan-300 underline inline-block"
            >
              {note.link}
            </span>
          )}
        </div>
      </div>
    );
  };

  NotificationItem.propTypes = {
    note: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string,
      link: PropTypes.string,
      read_status: PropTypes.bool,
    }).isRequired,
  };

  // Split notifications
  const newNots = notifications.filter((n) => !n.read_status);
  const earlier = notifications.filter((n) => n.read_status);

  return (
    <div className="min-h-[calc(100vh-70px)] text-white relative">
      <div className="px-[16px] lg:px-8">
        <div className="flex items-center justify-between lg:justify-end py-4 block lg:hidden">
          <NavbarLeft />
          <NavbarRight />
        </div>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold mt-8 mb-12 text-cyan-300 font-extrabold drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
            YOUR NOTIFICATIONS
          </h2>
          <div className="hidden lg:block">
            <NavbarRight />
          </div>
        </div>

        {/* NEW NOTIFICATIONS */}
        <div className="mb-8">
          <h2 className="text-cyan-400 text-xs mb-4">NEW</h2>
          {newNots.length > 0 ? (
            <div className="bg-[#151D26]">
              {newNots.map((note) => (
                <NotificationItem key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No New Notifications</p>
          )}
        </div>

        {/* EARLIER NOTIFICATIONS */}
        <div>
          <h2 className="text-cyan-400 text-xs mb-4">EARLIER</h2>
          {earlier.length > 0 ? (
            earlier.map((note) => (
              <NotificationItem key={note.id} note={note} />
            ))
          ) : (
            <p className="text-gray-600">No Earlier Notifications</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification;
