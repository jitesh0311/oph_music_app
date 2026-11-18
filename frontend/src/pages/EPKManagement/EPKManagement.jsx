import React, { useEffect, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { toast } from "react-hot-toast";
import axiosApi from "../../conf/axios";
import { uploadVideoViaPresignedPut } from "../../utils/presignedVideoUpload";
import { useArtist } from "../auth/API/ArtistContext";
import NavbarRight from "../../components/Navbar/NavbarRight";
import NavbarLeft from "../../components/Navbar/NavbarLeft";

const EPKManagement = () => {
  const navigate = useNavigate();
  const { ophid, headers } = useArtist();

  const [status, setStatus] = useState([]);
  const [formData, setFormData] = useState({
    bio: "",
    bioVideo: null,
    artistStory: "",
    artistStoryVideo: null,
    artistPhoto: null,
    updateImages: null,
    terms: false,
  });

  const [pic, setPic] = useState("");

  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const handleUploads = (e, field) => {
    const file = e.target.files[0];

    if (file) {
      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));
    }
  };

  const getSpecialArtistProfile = async () => {
    if (!headers || !headers.Authorization) {
      console.warn("Headers are not ready yet");
      setLoading(false);
      return;
    }

    try {
      const response = await axiosApi.get("/get-special-artist-pic", {
        headers: headers,
        params: { ophid },
      });

      if (response.data.success) {
        setPic(response.data.data[0].personal_photo);
        console.log(response.data.data);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = async () => {
    if (!headers || !headers.Authorization) {
      console.warn("Headers are not ready yet");
      setLoading(false);
      return;
    }

    try {
      const response = await axiosApi.get("/get-special-artist-status", {
        headers: headers,
        params: { ophid },
      });

      if (response.data.success) {
        setStatus(response.data.data);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStatus();
    getSpecialArtistProfile();
  }, [ophid, headers]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // console.log(formData.updateImages.length);

    const hasData =
      (formData.bio && formData.bio.trim() !== "") ||
      formData.bioVideo ||
      (formData.artistStory && formData.artistStory.trim() !== "") ||
      formData.artistStoryVideo ||
      formData.artistPhoto ||
      formData.updateImages;

    if (hasData) {
      if (!formData.terms) {
        toast.error("Please accept terms and conditions");
        return;
      }

      setLoading(true);
      const sendFormData = new FormData();

      sendFormData.append("ophid", ophid);
      if (formData.bio !== "") {
        sendFormData.append("bio", formData.bio);
      }
      if (formData.bioVideo instanceof File) {
        const bioVideoUrl = await uploadVideoViaPresignedPut(
          axiosApi,
          formData.bioVideo,
          { purpose: "epk-bio", headers, params: { ophid } },
        );
        sendFormData.append("bioVideoUrl", bioVideoUrl);
      }
      if (formData.artistStory !== "") {
        sendFormData.append("artistStory", formData.artistStory);
      }
      if (formData.artistStoryVideo instanceof File) {
        const storyVideoUrl = await uploadVideoViaPresignedPut(
          axiosApi,
          formData.artistStoryVideo,
          { purpose: "epk-story", headers, params: { ophid } },
        );
        sendFormData.append("artistStoryVideoUrl", storyVideoUrl);
      }
      if (formData.artistPhoto !== null) {
        sendFormData.append("artistPhoto", formData.artistPhoto);
      }
      if (formData.updateImages !== null) {
        sendFormData.append("updateImages", formData.updateImages);
      }

      try {
        const response = await axiosApi.post(
          "/edit-special-artist-details",
          sendFormData,
          {
            headers: {
              ...headers,
            },
          },
        );

        if (response.data.success) {
          setLoading(false);
          navigate("/dashboard/pending", {
            state: {
              heading: "Your Profile Details Is Successfully Submitted for Review!",
              btnText: "Back to Home",
              redirectTo: "/dashboard",
            },
          });
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Please edit atleast one field");
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
    <div className="ml-[16px] mr-[16px] lg:ml-[63px] lg:mr-[63px] mt-[20px] lg:mt-[55px]">
      <div className="flex flex-col lg:flex-row justify-between md:mb-8">
        <div className="w-full flex items-center justify-between lg:justify-end mb-[16px] block lg:hidden">
          <NavbarLeft />
          <NavbarRight />
        </div>
        <h2 className="text-[#5DC9DE] text-2xl sm:text-3xl font-bold uppercase drop-shadow-[0_0_15px_rgba(34,211,238,1)]">
          EPK Management
        </h2>
        <div className="hidden lg:block">
          <NavbarRight />
        </div>
      </div>

      <form
        className="flex flex-col gap-[20px] md:gap-[42px]"
        onSubmit={handleFormSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 mt-[30px] lg:mt-[35px] gap-[32px] md:gap-[54px]">
          <div className="flex flex-col">
            <div className="flex flex-col gap-[12px]">
              <p className="text-[17px] font-semibold text-white">Bio</p>

              <textarea
                className="w-full h-[150px]  w-full bg-gray-800/50 border rounded-lg border-gray-700 p-3 focus:outline-none focus:border-cyan-400"
                placeholder="Type your bio here"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    bio: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-[12px] mt-[24px] lg:mt-[36px]">
              <p className="text-[17px] font-semibold text-white">
                Bio video :
              </p>

              <div
                className="w-full min-h-[290px] p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors flex items-center justify-center"
                onClick={() => {
                  if (!formData.bioVideo) {
                    document.getElementById("bioVideo").click();
                  }
                }}
              >
                <input
                  type="file"
                  accept="video/*"
                  id="bioVideo"
                  onChange={(e) => handleUploads(e, "bioVideo")}
                  className="hidden"
                />

                {!formData.bioVideo ? (
                  <div className="flex items-center flex-col gap-3">
                    <Plus className="w-8 h-8 text-gray-500" />
                    <p className="font-medium text-[#666B76] text-[21px]">
                      Upload Video File
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <video
                      controls
                      className="max-h-[250px] rounded-lg"
                      src={URL.createObjectURL(formData.bioVideo)}
                    />

                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">
                        {formData.bioVideo.name}
                      </p>

                      <X
                        className="w-4 h-4 hover:text-red-500 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({
                            ...prev,
                            bioVideo: null,
                          }));
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-[17px] font-semibold text-white mt-[24px] md:mt-[32px] mb-[12px]">
                Change you Artist Story :
              </p>
              <input
                type="text"
                className="w-full bg-gray-800/50 border border-gray-700 rounded-full p-3 focus:outline-none focus:border-cyan-400"
                placeholder="Type your story here"
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    artistStory: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-[12px] mt-[36px]">
              <p className="text-[17px] font-semibold text-white">
                Change your Artist Story Video :
              </p>

              <div
                className="
      w-[100%] min-h-[290px] 
      p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors
      flex items-center justify-center
    "
                onClick={() =>
                  document.getElementById("artistStoryVideo").click()
                } // trigger hidden input
              >
                <input
                  id="artistStoryVideo"
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleUploads(e, "artistStoryVideo")}
                  className="hidden"
                />
                {formData.artistStoryVideo === null ? (
                  <div className="flex items-center flex-col gap-3">
                    <Plus className="w-8 h-8 text-gray-500" />
                    <p className="font-medium text-[#666B76] text-[21px]">
                      Upload Video File
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-3"
                    onClick={() =>
                      document.getElementById("artistStoryVideo").click()
                    }
                  >
                    <p className="font-medium text-white text-[21px]">
                      {formData.artistStoryVideo.name}
                    </p>
                    <X className="w-4 h-4 hover:text-red-500" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-[16px] md:gap-[43px]">
              {pic != "" && (
                <img
                  src={pic}
                  className="w-32 h-32 rounded-full border-4 border-[#5DC9DE] object-cover"
                />
              )}

              <div className="flex flex-col gap-[17px]">
                <p className="text-white font-bold md:font-medium text-[28px] md:text-[35px]">
                  Your Profile Photo
                </p>
                <p className="text-white font-medium text-[20px] hidden md:flex">
                  This is the face behind your music. Upload a high-quality
                  photo that truly represents you as an artist.{" "}
                </p>
              </div>
            </div>
            <p className="text-white font-medium text-[18px] flex md:hidden mt-[16px]">
              This is the face behind your music. Upload a high-quality photo
              that truly represents you as an artist.{" "}
            </p>
            <div
              className="
                w-[100%]
                w-[100%] min-h-[130px] 
                opacity-100
                p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors
                flex items-center justify-center 
                mt-[20px]
                md:mt-[60px]
                "
              onClick={() => document.getElementById("artistPhoto").click()}
            >
              <input
                id="artistPhoto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploads(e, "artistPhoto")}
              />
              {formData.artistPhoto === null ? (
                <div className="flex items-center flex-col gap-3">
                  <Plus className="w-8 h-8 text-gray-500" />
                  <p className="font-medium text-[#666B76] text-[15px]">
                    Upload Image File
                  </p>
                </div>
              ) : (
                <div
                  className="flex items-center justify-center gap-3"
                  onClick={() => document.getElementById("artistPhoto").click()}
                >
                  <p className="font-medium text-white text-[21px]">
                    {formData.artistPhoto.name}
                  </p>
                  <X className="w-4 h-4 hover:text-red-500" />
                </div>
              )}
            </div>
            <p className="text-white font-medium text-[32px] md:text-[40px] mt-[20px] md:mt-[35px] mb-[6px] md:mb-[25px]">
              FEED IMAGE
            </p>

            <div className="flex flex-col gap-[12px]">
              <p className="text-[17px] font-semibold text-white">
                Change Your Images:
              </p>

              <div
                className="
                w-[100%]
                w-[100%] min-h-[290px] 
               p-6 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-cyan-400 transition-colors
                flex items-center justify-center 
                "
                onClick={() => document.getElementById("updateImages").click()}
              >
                <input
                  id="updateImages"
                  accept="image/*"
                  type="file"
                  className="hidden"
                  onChange={(e) => handleUploads(e, "updateImages")}
                />
                {formData.updateImages === null ? (
                  <div className="flex items-center flex-col gap-3">
                    <Plus className="w-8 h-8 text-gray-500" />
                    <p className="font-medium text-[#666B76] text-[21px]">
                      Upload Image File
                    </p>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-center gap-3"
                    onClick={() =>
                      document.getElementById("updateImages").click()
                    }
                  >
                    <p className="font-medium text-white text-[21px]">
                      {formData.updateImages.name}
                    </p>
                    <X className="w-4 h-4 hover:text-red-500" />
                  </div>
                )}
              </div>
            </div>

            <p className="text-white font-medium text-[14px] md:text-[20px] mt-[20px] md:mt-[35px]">
              ADD SONG TO YOUR PROFILE (Adding Process of Song is Separate from Profile Details)
            </p>
            <Link
              to="/dashboard/add-new-song"
              className="bg-[#6F4FA0] text-white text-center px-[36px] py-[17px] rounded-[42px] mt-[15px] md:mt-[30px] w-full md:max-w-[300px] 
hover:bg-[#5A3F85] "
            >
             Upload Song Details
            </Link>
          </div>
        </div>
        <div className="mt-[16px] md:mt-[30px] flex items-center">
          <input
            type="checkbox"
            id="terms"
            name="terms"
            className="w-[20px] h-[20px]"
            checked={formData.terms}
            onChange={() =>
              setFormData((prev) => ({
                ...prev,
                terms: !prev.terms,
              }))
            }
          />
          <label
            className="ml-[33px] text-[20px] font-semibold text-white"
            for="terms"
          >
            I Have Read and Agree to the Terms & Conditions{" "}
          </label>
        </div>
        <button className="w-full md:w-[374px] mx-auto bg-cyan-400 text-gray-900 rounded-full py-3 font-semibold hover:bg-cyan-300 transition-colors mb-[20px]">
          Submit Profile Details
        </button>
      </form>

      {status.length > 0 && (
        <section className="mb-[20px]">
          <h1 className="font-extrabold text-[35px] lg:text-[55px] mt-[20px] md:mt-[55px] text-[#5DC9DE]">
            GET YOUR UPDATE STATUS
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
                      {new Date(stat.date).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      YOUR REQUESTS 
                    </p>
                    <p className="text-white font-bold text-base uppercase">
                      {stat.field} Update
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Status
                    </p>
                    <p className="text-white font-bold text-base uppercase">
                      {stat.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-1">
                      Reason
                    </p>
                    <p className="text-white font-bold text-base">
                      {stat.reason || "-"}
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
              style={{ minWidth: "600px", width: "100%" }}
            >
              <thead>
                <tr className="border-b border-b-[#FFFFFF33] text-left">
                  <th className="pb-[14px] text-[15px] font-semibold">DATE</th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    REQUEST
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    STATUS
                  </th>
                  <th className="pb-[14px] text-[15px] font-semibold">
                    REASON
                  </th>
                </tr>
              </thead>
              <tbody>
                {status.map((stat, index) => (
                  <tr key={index}>
                    <td className="py-[12px] font-bold text-[16px]">
                      {new Date(stat.date).toLocaleDateString("en-GB", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.field} update
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.status}
                    </td>
                    <td className="py-[12px] font-bold text-[16px]">
                      {stat.reason || "-"}
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

export default EPKManagement;
