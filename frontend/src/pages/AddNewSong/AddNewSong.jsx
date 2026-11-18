import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import axiosApi from "../../conf/axios";
import { useArtist } from "../auth/API/ArtistContext";
import { useLocation, useNavigate } from "react-router-dom";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

const AddNewSong = () => {
  const [formData, setFormData] = useState({
    songName: "",
    views: "",
    credits: "",
    time: "",
    proof: "",
    audioFile: null,
    terms: false,
    songType: "",
  });
  const [status, setStatus] = useState([]);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { headers, ophid } = useArtist();
  const [loading, setLoading] = useState(false);
  const [isFree, setIsFree] = useState(0);
  const location = useLocation();
  const songId = location?.state?.song_id;

  // handle input change
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
  };

  // validation
  const validate = () => {
    let newErrors = {};
    const durationRegex = /^[0-9]{1,2}:[0-5][0-9]$/;

    if (!formData.songName.trim()) newErrors.songName = "Song name is required";
    if (!formData.proof.trim()) newErrors.proof = "Proof is required";
    if (!formData.views || isNaN(formData.views))
      newErrors.views = "Views must be a number";
    if (!formData.credits.trim())
      newErrors.credits = "Credits field is required";

    if (!formData.time.trim()) {
      newErrors.time = "Time field is required";
    } else if (!durationRegex.test(formData.time.trim())) {
      newErrors.time = "Invalid format. Use mm:ss (e.g., 3:45)";
    }

    // simple URL validatio
    if (!formData.audioFile) newErrors.audioFile = "Audio file is required";
    if (!formData.terms)
      newErrors.terms = "You must agree to terms and conditions";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const getSpecialArtistSong = async () => {
    if (!headers || !headers.Authorization) {
      console.warn("Headers are not ready yet");
      return;
    }
    console.log(songId);

    try {
      const response = await axiosApi.get("/get-special-artist-song", {
        headers: headers,
        params: { songId },
      });

      if (response.data.success) {
        console.log(response.data.data[0]);

        const res = response.data.data[0];

        setFormData({
          songName: res.song_name,
          views: res.views,
          credits: res.credits,
          time: res.duration,
          proof: res.proof,
          audioFile: res.audio_url, // you missed "res." here
          terms: true,
          songType: res.song_type,
        });
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const getSongStatus = async () => {
    if (!headers || !headers.Authorization) {
      console.warn("Headers are not ready yet");
      return;
    }

    try {
      const response = await axiosApi.get("/get-special-artist-song-status", {
        headers: headers,
        params: {
          ophid,
          ...(songId ? { excludeSongId: songId } : {}),
        },
      });

      if (response.data.success) {
        setStatus(response.data.data);

        setIsFree(response.data.isSongFree);

        console.log(response.data.isSongFree);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    getSongStatus();
    getSpecialArtistSong();
  }, [ophid, headers, songId]);

  // handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    let songType = "";

    if (formData.songType != "") {
      if (formData.songType === "free" && isFree === true) {
        songType = "free";
      } else if (formData.songType === "free" && isFree === false) {
        songType = "paid";
      } else if (formData.songType === "paid" && isFree === true) {
        songType = "free";
      } else if (formData.songType === "paid" && isFree === false) {
        songType = "paid";
      }
    } else {
      if (isFree === true) {
        songType = "free";
      } else {
        songType = "paid";
      }
    }

    if (validate()) {
      const sendFormData = new FormData();
      sendFormData.append("ophid", ophid);
      sendFormData.append("songID", songId || "");
      sendFormData.append("songName", formData.songName);
      sendFormData.append("views", formData.views);
      sendFormData.append("credits", formData.credits);
      sendFormData.append("time", formData.time);
      sendFormData.append("proof", formData.proof);
      sendFormData.append("songType", songType);
      sendFormData.append("audioFile", formData.audioFile);
      console.log(formData.songType);
      const getSongStatus = status.find((stat) => stat.song_id === songId);
      console.log(getSongStatus);

      try {
        setLoading(true);
        const response = await axiosApi.post(
          "/insert-special-artist-song",
          sendFormData,
          {
            headers: {
              ...headers,
            },
          },
        );

        if (response.data.success) {
          const data = Object.values(response.data.data);
          setLoading(false);

          const getSongStatus = status.find((stat) => stat.song_id === songId);

          if (formData.songType != "") {
            if (formData.songType === "free" && isFree === true) {
              navigate("/dashboard/pending", {
                state: {
                  heading: "Your request is under review",
                  btnText: "Back to Home",
                  redirectTo: "/dashboard",
                },
              });
            } else if (formData.songType === "free" && isFree === false) {
              navigate("/auth/payment", {
                state: {
                  heading: "Add Your Song in EPK Fee —",
                  from: "Special artist song registration",
                  song_id: data[0].song_id,
                  backPath: "/dashboard/add-new-song",
                },
              });
            } else if (
              formData.songType === "paid" &&
              getSongStatus.payment_status != "rejected"
            ) {
              navigate("/dashboard/pending", {
                state: {
                  heading: "Your request is under review",
                  btnText: "Back to Home",
                  redirectTo: "/dashboard",
                },
              });
            } else if (
              formData.songType === "paid" &&
              getSongStatus.payment_status === "rejected"
            ) {
              navigate("/auth/payment", {
                state: {
                  heading: "Add Your Song in EPK Fee —",
                  from: "Special artist song registration",
                  song_id: data[0].song_id,
                  backPath: "/dashboard/add-new-song",
                },
              });
            }
          } else {
            if (isFree == true) {
              navigate("/dashboard/pending", {
                state: {
                  heading: "Your request is under review",
                  btnText: "Back to Home",
                  redirectTo: "/dashboard",
                },
              });
            } else {
              navigate("/auth/payment", {
                state: {
                  heading: "Add Your Song in EPK Fee —",
                  from: "Special artist song registration",
                  song_id: data[0].song_id,
                  backPath: "/dashboard/add-new-song",
                },
              });
            }
          }
        }
      } catch (err) {
        console.error(err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 min-h-[calc(100dvh-170px)] flex justify-center items-center flex-col">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
        <p className="mt-2 text-cyan-400">
          OPH Community is delighted to have you here! Joining the OPH Community
          will be one of the best decisions you ever make.
        </p>
      </div>
    );
  }

  return (
    <div className=" mx-[16px] lg:ml-[63px] lg:mr-[63px] mt-[20px] md:mt-[35px]">
      <div className="flex flex-col lg:flex-row justify-between lg:mb-8">
        <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
          <NavbarLeft />
          <NavbarRight />
        </div>
        <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
          ADD SONG TO YOUR PROFILE{" "}
        </h2>
        <div className="hidden lg:block">
          <NavbarRight />
        </div>
      </div>
      <form
        className="mt-0 lg:mt-[40px] flex items-start lg:items-center justify-center flex-col w-full"
        onSubmit={handleSubmit}
      >
        {/* Song Name */}
        <div className="w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white mt-[32px] mb-[12px]">
            Song name :
          </p>
          <input
            type="text"
            name="songName"
            value={formData.songName}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="Type the song name here"
          />
          {errors.songName && (
            <p className="text-red-500 text-sm">{errors.songName}</p>
          )}
        </div>

        {/* Views */}
        <div className="w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white mt-[32px] mb-[12px]">
            Views :
          </p>
          <input
            type="text"
            name="views"
            value={formData.views}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="Add the views in numbers"
          />
          {errors.views && (
            <p className="text-red-500 text-sm">{errors.views}</p>
          )}
        </div>

        {/* Credits */}
        <div className="w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white mt-[32px] mb-[12px]">
            Credits :
          </p>
          <input
            type="text"
            name="credits"
            value={formData.credits}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="Type the song credits here"
          />
          {errors.credits && (
            <p className="text-red-500 text-sm">{errors.credits}</p>
          )}
        </div>

        {/* Time */}
        <div className="w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white mt-[32px] mb-[12px]">
            Song Duration :
          </p>
          {/* <input
            type="text"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="mm:ss or hh:mm:ss"
          /> */}

          <input
            type="text"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="Add the duration in mins:secs – 1:25"
          />

          {errors.time && <p className="text-red-500 text-sm">{errors.time}</p>}
        </div>

        {/* Proof */}
        <div className="w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white mt-[32px] mb-[12px]">
            Proof Link :
          </p>
          <input
            type="text"
            name="proof"
            value={formData.proof}
            onChange={handleChange}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
            placeholder="Paste any proof link here"
          />
          {errors.proof && (
            <p className="text-red-500 text-sm">{errors.proof}</p>
          )}
        </div>

        {/* Audio File */}
        <div className="flex flex-col gap-[12px] mt-[36px] w-full max-w-unset lg:max-w-[764px]">
          <p className="text-[17px] font-semibold text-white">Audio file :</p>
          <input
            type="file"
            accept="audio/*"
            name="audioFile"
            onChange={handleChange}
            className="hidden"
            id="audioUpload"
          />
          <label
            htmlFor="audioUpload"
            className="w-full min-h-[150px] p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors flex items-center justify-center"
          >
            {!formData.audioFile ? (
              <div className="flex items-center flex-col gap-3">
                <Plus className="w-8 h-8 text-gray-500" />
                <p className="font-medium text-white text-[21px]">
                  Upload Your Audio File
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <p className="font-medium text-white text-[21px]">
                  {typeof formData.audioFile === "string"
                    ? formData.audioFile.split("/").pop() // extract filename from URL
                    : formData.audioFile.name}
                </p>
                <X
                  className="w-4 h-4 hover:text-red-500 cursor-pointer"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, audioFile: null }))
                  }
                />
              </div>
            )}
          </label>
          {errors.audioFile && (
            <p className="text-red-500 text-sm">{errors.audioFile}</p>
          )}
        </div>

        {/* Terms */}
        <div className="mt-[24px] md:mt-[50px] flex items-center">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            checked={formData.terms}
            onChange={handleChange}
            className="w-[20px] h-[20px]"
          />
          <p className="ml-[33px] text-[20px] font-semibold text-white">
            Agree to terms and conditions
          </p>
        </div>
        {errors.terms && <p className="text-red-500 text-sm">{errors.terms}</p>}

        <button
          type="submit"
          className="w-full md:w-[374px] mx-auto mt-[30px] md:mt-[60px] bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors mb-[20px]"
        >
          SUBMIT
        </button>
      </form>

      {status.length > 0 && (
        <section className="mb-[20px]">
          <h1 className="font-extrabold text-[35px] lg:text-[55px] mt-[20px] md:mt-[55px] text-[#5DC9DE]">
            GET YOUR SONG UPDATE STATUS
          </h1>

          {/* Mobile card layout */}
          <div className="lg:hidden mt-6 flex flex-col">
            {status.map((stat, index) => (
              <div key={index}>
                <div className="grid grid-cols-2 gap-y-4 py-5">
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Date
                    </p>
                    <p className="text-white font-bold text-base">
                      {new Date(stat.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Song Name
                    </p>
                    <p className="text-white font-bold text-base uppercase">
                      {stat.song_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Type
                    </p>
                    <p className="text-white font-bold text-base uppercase">
                      {stat.song_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Status
                    </p>
                    <p
                      className={`font-bold text-base uppercase ${
                        stat.status?.toLowerCase().includes("rejected")
                          ? "text-red-500"
                          : stat.status === "pending" &&
                              stat.song_type === "paid" &&
                              stat.payment_status === null
                            ? "text-blue-400"
                            : "text-white"
                      }`}
                      onClick={() => {
                        const s = stat.status?.toLowerCase();
                        const isPaid = stat.song_type === "paid";
                        if (
                          s === "pending" &&
                          isPaid &&
                          stat.payment_status === null
                        ) {
                          navigate("/auth/payment", {
                            state: {
                              heading: "Add Your Song in EPK Fee —",
                              from: "Special artist song registration",
                              song_id: stat.song_id,
                              backPath: "/dashboard/add-new-song",
                            },
                          });
                        } else if (isPaid && s === "song & payment rejected") {
                          window.location.reload();
                          navigate("/dashboard/add-new-song", {
                            state: { song_id: stat.song_id },
                          });
                        } else if (s === "song rejected") {
                          window.location.reload();
                          navigate("/dashboard/add-new-song", {
                            state: { song_id: stat.song_id },
                          });
                        } else if (s === "payment rejected") {
                          navigate("/auth/payment", {
                            state: {
                              heading: "Add Your Song in EPK Fee —",
                              from: "Special artist song registration",
                              song_id: stat.song_id,
                              backPath: "/dashboard/add-new-song",
                            },
                          });
                        }
                      }}
                    >
                      {stat.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      REASON FOR SONG
                    </p>
                    <p className="text-white font-bold text-base">
                      {stat.song_rejection_reason || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      REASON FOR PAYMENT
                    </p>
                    <p className="text-white font-bold text-base">
                      {stat.payment_rejection_reason || "-"}
                    </p>
                  </div>
                </div>
                {index < status.length - 1 && (
                  <div className="border-b border-[#FFFFFF33]" />
                )}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div
            className="hidden lg:block"
            style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
          >
            <table
              className="border-collapse mt-[41px]"
              style={{ minWidth: "700px", width: "100%" }}
            >
              <thead>
                <tr className="border-b border-b-[#FFFFFF33] text-left">
                  <th className="pb-[14px] text-[15px] font-semibold">DATE</th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    SONG NAME
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    SONG TYPE
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    STATUS
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    SONG REJ REASON
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    PAYMENT REJ REASON
                  </th>
                </tr>
              </thead>
              <tbody>
                {status.map((stat) => (
                  <tr>
                    <td className="py-[12px] font-bold text-[16px]">
                      {new Date(stat.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.song_name}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.song_type}
                    </td>
                    <td
                      className={`py-[12px] font-bold text-[16px] ${
                        stat.status?.toLowerCase().includes("rejected")
                          ? "text-red-600 cursor-pointer"
                          : stat.status === "pending" &&
                              stat.song_type === "paid" &&
                              stat.payment_status === null
                            ? "cursor-pointer text-blue-600 hover:underline"
                            : ""
                      }`}
                      onClick={() => {
                        const status = stat.status?.toLowerCase();
                        const isPaid = stat.song_type === "paid";
                        if (
                          status === "pending" &&
                          isPaid &&
                          stat.payment_status === null
                        ) {
                          navigate("/auth/payment", {
                            state: {
                              heading: "Add Your Song in EPK Fee —",
                              from: "Special artist song registration",
                              song_id: stat.song_id,
                              backPath: "/dashboard/add-new-song",
                            },
                          });
                        } else if (
                          isPaid &&
                          status === "song & payment rejected"
                        ) {
                          window.location.reload();
                          navigate("/dashboard/add-new-song", {
                            state: { song_id: stat.song_id },
                          });
                        } else if (status === "song rejected") {
                          window.location.reload();
                          navigate("/dashboard/add-new-song", {
                            state: { song_id: stat.song_id },
                          });
                        } else if (status === "payment rejected") {
                          navigate("/auth/payment", {
                            state: {
                              heading: "Add Your Song in EPK Fee —",
                              from: "Special artist song registration",
                              song_id: stat.song_id,
                              backPath: "/dashboard/add-new-song",
                            },
                          });
                        }
                      }}
                    >
                      {stat.status}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.song_rejection_reason
                        ? stat.song_rejection_reason
                        : "-"}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.payment_rejection_reason
                        ? stat.payment_rejection_reason
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default AddNewSong;
