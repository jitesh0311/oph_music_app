import React, { useEffect, useRef, useState } from "react";
import { Play, ChevronDown, Pause } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import axiosApi from "../../conf/axios";
import { FaPause, FaPlay } from "react-icons/fa";
import Face from "../../../public/assets/images/facebook.png";
import Insta from "../../../public/assets/images/instagram.png";
import Story from "../../../public/assets/images/story.png";
import Spotify from "../../../public/assets/images/spotify.png";
import Apple from "../../../public/assets/images/apple.png";
import Edit from "../../../public/assets/images/edit.png";
import { useArtist } from "../../pages/auth/API/ArtistContext";
import { useSelector } from "react-redux";
import { IoIosArrowRoundDown } from "react-icons/io";
import NavbarLeft from "../../components/Navbar/NavbarLeft";
import NavbarRight from "../../components/Navbar/NavbarRight";
import { SongDuration } from "../ArtistSpotlight/ArtistSpotlight";
import CustomVideoPlayer from "../../components/CustomVideoPlayer/CustomVideoPlayer";
const MYEPK = () => {
  const [artist, setArtist] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [showButton, setShowButton] = useState(true);
  const [videoElement, setVideoElement] = useState(null);
  const [currentAudio, setCurrentAudio] = useState(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingVid, setIsPlayingVid] = useState(false);
  const videoRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [relatedArtists, setRelatedArtists] = useState([]);

  const [audio, setAudio] = useState(null);
  const [playingSongId, setPlayingSongId] = useState(null);
  const [progress, setProgress] = useState({}); // { [songId]: { current, duration } }
  const audioRefs = useRef({}); // { [songId]: HTMLAudioElement }

  const { headers, ophid } = useArtist();

  const handleImageClick = (src) => {
    setSelectedImage(src);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };
  const handleDownload = async () => {
    if (selectedImage) {
      try {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "image.jpg"); // This will open the "Save As" dialog
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Failed to download image:", error);
      }
    }
  };

  const fetchSpecialArtist = async () => {
    setIsLoading(true);
    try {
      if (!headers || !headers.Authorization) {
        console.warn("Headers are not ready");
        return;
      }

      const response = await axiosApi.get(
        `/get-special-artist-detail?ophid=${ophid}`,
        {
          headers: headers,
        },
      );

      console.log(response.data.data);

      setArtist(response.data.data);
    } catch (err) {
      console.log(err);
      setError("Artist Not Found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ophid) {
      fetchSpecialArtist();
    }
  }, [headers, ophid]);

  // Listen for pauseAllAudio event to pause audio when video plays
  useEffect(() => {
    const handlePauseAllAudio = () => {
      Object.values(audioRefs.current).forEach((a) => a.pause());
      setPlayingSongId(null);
    };
    window.addEventListener("pauseAllAudio", handlePauseAllAudio);
    return () => window.removeEventListener("pauseAllAudio", handlePauseAllAudio);
  }, []);

  const [isOpen, setIsOpen] = useState(false);

  const handleModalOpen = (e) => {
    e.preventDefault(); // prevents navigation
    setIsOpen(true);
  };

  const handleModalClose = () => {
    setIsOpen(false);
  };

  const handlePlayPauseVideo = () => {
    const video = videoRef.current?.videoElement || videoRef.current;
    if (video) {
      if (video.paused) {
        // Pause audio when video starts playing
        if (audio && !audio.paused) {
          audio.pause();
          setPlayingSongId(null);
        }
        video.play();
        setShowButton(false);
      } else {
        video.pause();
        setShowButton(true);
      }
      setIsPlaying(!video.paused);
    }
  };

  const getOrCreateAudio = (song) => {
    if (!audioRefs.current[song.id]) {
      const a = new Audio(song.audio_url);
      a.addEventListener("timeupdate", () => {
        setProgress((p) => ({ ...p, [song.id]: { current: a.currentTime, duration: a.duration || 0 } }));
      });
      a.addEventListener("loadedmetadata", () => {
        setProgress((p) => ({ ...p, [song.id]: { current: a.currentTime, duration: a.duration || 0 } }));
      });
      a.addEventListener("ended", () => {
        setPlayingSongId(null);
        setProgress((p) => ({ ...p, [song.id]: { current: 0, duration: a.duration || 0 } }));
        a.currentTime = 0;
      });
      audioRefs.current[song.id] = a;
    }
    return audioRefs.current[song.id];
  };

  const handlePlayPause = (song) => {
    const a = getOrCreateAudio(song);
    if (playingSongId === song.id) {
      if (!a.paused) {
        a.pause();
        setPlayingSongId(null);
      } else {
        if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); setShowButton(true); }
        a.play().catch(console.error);
        setPlayingSongId(song.id);
      }
    } else {
      if (videoRef.current && !videoRef.current.paused) { videoRef.current.pause(); setShowButton(true); }
      // pause currently playing
      if (audio) audio.pause();
      setAudio(a);
      a.play().catch(console.error);
      setPlayingSongId(song.id);
    }
  };

  const handleSeek = (song, value) => {
    const a = audioRefs.current[song.id];
    if (a) {
      a.currentTime = Number(value);
      setProgress((p) => ({ ...p, [song.id]: { current: Number(value), duration: a.duration || 0 } }));
    }
  };

  const sumOfPlays = (songs) => {

    let sum = 0;

    for(let i = 0; i < songs.length; i++)
    {
        sum += songs[i].total_song_views;
    }

    return sum;

  }

  const formatListeners = (views) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M+ Listeners`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K+ Listeners`;
    }
    return `${views} Listeners`;
  };

  const handleSongDownload = (song, name) => {
    const link = document.createElement("a");
    console.log(name);

    link.href = song.audio_file_url; // Ensure the URL is correct and accessible
    link.setAttribute("download", name || "song.mp3"); // Set a default file name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <>
      {isLoading && (
        <div className="text-center h-[90vh] w-full  py-32">
          <div className="animate-spin rounded-full w-12 h-12  border-b-2 border-[#5DC9DE] mx-auto"></div>
          <p className="mt-2 text-[#5DC9DE]">
            🎶 "Tuning the strings... your music is on its way!" 🎵
          </p>
        </div>
      )}
      {error && (
        <div className="text-center flex flex-col justify-center items-center h-[80vh] w-full ">
          <h1 className="text-3xl">ERROR 404 PAGE NOTs FOUND</h1>
          <Link to={"/"}>
            <button className="px-5 py-2 bg-[#5DC9DE] text-black mt-4 rounded-full">
              Go Back
            </button>
          </Link>
        </div>
      )}
      {!isLoading && !error && artist && artist.name && (
        <div className="relative  text-white    min-h-screen">
          {/* Background with gradient */}
          <div
            className="absolute inset-0  bg-black"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.7) 50%, rgba(0, 0, 0, 1) 100%), url(${
                artist.photos[0]
              })`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              height: "90vh",
            }}
          />
          {/* <div className="absolute inset-0 bg-black bg-opacity-50" /> */}
          {/* Solid black overlay for bottom half */}

          {/* Content */}
          <div className="w-full relative px-[16px] xl:px-16 lg:px-10 lg:mx-auto pt-[10px] lg:pt-[200px] pb-[24px]">
            {/* Mobile navigation header */}
            <div className="flex items-center justify-between mb-[40px] block lg:hidden">
              <NavbarLeft />
              <NavbarRight />
            </div>
            {/* Name Header */}
            <h1 className="text-5xl md:text-7xl text-white font-bold mb-4 ">
              {artist.name}
            </h1>
            <p className="my-4">
              Stage Name:
              <span className="text-[#5DC9DE]"> {artist.stage_name}</span>
            </p>

            {/* Profile Section */}
            <div className="grid grid-cols-3 gap-8 mb-12 relative">
              <div className="w-full sm:col-span-1 col-span-3 h-full relative">
                <CustomVideoPlayer
                  ref={videoRef}
                  src={artist.video_bio}
                  poster={
                    artist.personal_photo ||
                    "/assets/images/struggleSectionThumbnail.png"
                  }
                  className="w-full rounded-xl overflow-hidden aspect-[4/3]"
                  showPlayButtonOverlay={showButton}
                  pauseOtherVideos={true}
                  onPlay={() => {
                    setShowButton(false);
                    // Pause audio when video starts playing
                    if (audio && !audio.paused) {
                      audio.pause();
                      setPlayingSongId(null);
                    }
                  }}
                  onPause={() => setShowButton(true)}
                  onPlayButtonClick={handlePlayPauseVideo}
                />
              </div>

              <div className="flex flex-col col-span-3 sm:col-span-2">
                <p className="text-gray-400 mb-2">
                  Profession:{" "}
                  <span className="font-bold text-white">
                    {artist.profession}
                  </span>
                </p>
                <p className="text-gray-400 mb-2">
                  Location:{" "}
                  <span className="font-bold text-white">
                    {artist.location}
                  </span>
                </p>
                {artist.total_content > 0 && (
                  <p className="text-primary mb-2 font-bold">
                    {artist.total_content}{" "}
                    {artist.total_content > 1 ? "Songs" : "Song"}
                    {/* {artist.total_views > 0 && "— " + formatListeners(artist.total_views)} */}
                    <span className="text-primary mb-2 font-bold"> - { sumOfPlays(artist.songs) } Listeners</span>
                  </p>
                  
                )}
                <span className="text-primary mb-2 font-bold"></span>
                <p className="text-gray-400 mb-6">{artist.bio}</p>

                <div className="flex justify-start sm:justify-normal gap-4">
                  <a
                    target="_blank"
                    href={artist.facebook_url}
                    className="text-white hover:text-white"
                  >
                    <img
                      src={Face}
                      alt="Social"
                      className="opacity-70 w-10 h-10 object-cover hover:opacity-100"
                    />
                  </a>
                  <a
                    target="_blank"
                    href={artist.instagram_url}
                    className="text-white w-10 h-10 object-cover hover:text-white"
                  >
                    <img
                      src={Insta}
                      alt="Social"
                      className="opacity-70 hover:opacity-100"
                    />
                  </a>
                  <a
                    href={artist.spotify_url || ""}
                    className="text-white w-10 h-10 object-cover hover:text-white"
                  >
                    <img
                      src={Spotify}
                      alt="Social"
                      className="opacity-70 hover:opacity-100"
                    />
                  </a>
                  <a
                    href={artist.apple_url || ""}
                    className="text-white hover:text-white"
                  >
                    <img
                      src={Apple}
                      alt="Social"
                      className="opacity-70 w-10 h-10 object-cover hover:opacity-100"
                    />
                  </a>

                  <div>
                    {artist?.artist_story_video ? (
                      <>
                        {/* Image trigger */}
                        <a
                          href={artist.artist_story_video}
                          className="text-white hover:text-white"
                          onClick={handleModalOpen}
                        >
                          <img
                            src={Story}
                            alt="Social"
                            className="opacity-70 w-10 h-10 object-cover hover:opacity-100"
                          />
                        </a>

                        {/* Modal */}
                        {isOpen && (
                          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
                            <div className="relative w-[95%] max-w-3xl shadow-xl p-4">
                              {/* Close button */}
                              <button
                                onClick={handleModalClose}
                                className="absolute top-3 right-3 z-50 
                    text-white 
                    font-bold
                   w-10 h-10 flex items-center justify-center 
                   text-2xl shadow-lg"
                              >
                                &times;
                              </button>

                              {/* Video */}
                              <div className="aspect-w-16 aspect-h-9">
                                <CustomVideoPlayer
                                  src={artist.artist_story_video}
                                  className="w-full h-full rounded-lg"
                                  autoPlay
                                  pauseOtherVideos={true}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <button className=" opacity-50 ">
                        <img
                          src={Story}
                          alt="Social"
                          className="opacity-70 w-10 h-10 object-cover hover:opacity-50"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="absolute bottom-[105px] right-0 lg:bottom-0 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("/dashboard/epk-management", {
                    state: {
                      photo: artist.photos[0],
                    },
                  });
                }}
              >
                <img src={Edit} className="w-[55px] h-[55px]" />
              </button>
            </div>

            {/* Songs List */}
            {artist.songs.filter((song) =>
              (song.song_type === "free" && song.song_status === "approved") ||
              (song.song_type === "paid" && song.song_status === "approved" && song.payment_status === "approved")
            ).length > 0 ? (
              <div className="w-full mb-12">
                {/* Desktop Table */}
                <table className="hidden sm:table w-full text-sm lg:text-base table-auto">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-800">
                      <th className="pb-3 px-1 text-center">#</th>
                      <th className="pb-3 px-1 text-center">SONGS NAME</th>
                      <th className="pb-3 px-1 text-center">LISTENERS</th>
                      <th className="pb-3 px-1 text-center">DURATION</th>
                      <th className="pb-3 px-1 text-center">PLAY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artist.songs
                      .filter((song) =>
                        (song.song_type === "free" && song.song_status === "approved") ||
                        (song.song_type === "paid" && song.song_status === "approved" && song.payment_status === "approved")
                      )
                      .map((song, index) => (
                        <tr key={song.id || index} className="border-b border-gray-800 hover:bg-gray-800/50 text-white">
                          <td className="py-3 px-1 text-center">{index + 1}</td>
                          <td className="py-3 px-1 text-center">
                            <div className="flex flex-col items-center">
                              <span className="font-medium">{song.song_name}</span>
                              <span className="text-gray-400 text-xs">{song.primary_artist}</span>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-center">
                            {song.total_song_views > 0 ? song.total_song_views : "—"}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <SongDuration url={song.audio_url} />
                          </td>
                          <td className="py-3 px-1 text-center">
                            <button className="p-2 bg-[#6F4FA0] rounded-full" onClick={() => handlePlayPause(song)}>
                              {playingSongId === song.id && !audio?.paused ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div className="flex sm:hidden flex-col">
                  {artist.songs
                    .filter((song) =>
                      (song.song_type === "free" && song.song_status === "approved") ||
                      (song.song_type === "paid" && song.song_status === "approved" && song.payment_status === "approved")
                    )
                    .map((song, index) => {
                      const isActive = playingSongId === song.id;
                      const prog = progress[song.id] || { current: 0, duration: 0 };
                      const pct = prog.duration > 0 ? (prog.current / prog.duration) * 100 : 0;
                      return (
                        <div key={song.id || index} className="border-b border-gray-800 py-4">
                          {/* Row: index + song info + play button */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-white text-sm mb-1">{String(index + 1).padStart(2, "0")}</p>
                              <p className="text-white font-bold text-base leading-tight">{song.song_name}</p>
                              <p className="text-gray-400 text-sm">{song.primary_artist}</p>
                            </div>
                            <button
                              className="w-9 h-9 bg-[#6F4FA0] rounded-full flex items-center justify-center flex-shrink-0 ml-3"
                              onClick={() => handlePlayPause(song)}
                            >
                              {isActive && !audioRefs.current[song.id]?.paused ? (
                                <Pause className="w-4 h-4 text-white" />
                              ) : (
                                <Play className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>

                          {/* Progress bar — only when active */}
                          {isActive && (
                            <div className="mt-3 relative flex items-center">
                              <input
                                type="range"
                                min={0}
                                max={prog.duration || 100}
                                step={0.1}
                                value={prog.current}
                                onChange={(e) => handleSeek(song, e.target.value)}
                                className="song-progress w-full h-1 appearance-none rounded-full cursor-pointer"
                                style={{
                                  background: `linear-gradient(to right, #5DC9DE ${pct}%, #4b5563 ${pct}%)`,
                                }}
                              />
                            </div>
                          )}

                          {/* Plays + Duration + Download */}
                          <div className="flex items-end justify-between mt-2 gap-[6px]">
                            <div className="flex flex-col gap-[8px] mt-[6px]">
                              <p className="text-white text-sm">{song.total_song_views > 0 ? song.total_song_views.toLocaleString("en-IN") : "—"}</p>
                              <p className="text-white text-sm"><SongDuration url={song.audio_url} /></p>
                            </div>
                            <button
                              className="w-9 h-9 bg-[#5DC9DE] rounded-full flex items-center justify-center flex-shrink-0"
                              onClick={() => handleSongDownload(song, song.song_name)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 4v12M8 12l4 4 4-4" />
                                <line x1="4" y1="20" x2="20" y2="20" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-xl text-center mb-20">
                No song uploaded
              </p>
            )}
            {/* Image Gallery */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {artist &&
                artist.photos.map((src, index) => (
                  <div key={index + 1} className="aspect-square">
                    <img
                      src={src}
                      alt={`Gallery image ${index + 2}`}
                      className="w-full h-full object-cover cursor-pointer rounded-lg"
                      onClick={() => handleImageClick(src)}
                    />
                  </div>
                ))}
            </div>

            {selectedImage && (
              <div className="fixed inset-0 bg-black pb-6  bg-opacity-70 flex items-center justify-center z-50">
                <div className="relative   p-4 rounded-lg max-w-[90%] max-h-[90%]">
                  <button
                    className="absolute top-2 right-2 text-white text-2xl bg-black rounded-full w-8 h-8 flex items-center justify-center"
                    onClick={handleCloseModal}
                  >
                    ✕
                  </button>
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="max-w-full max-h-[80vh] rounded-md"
                  />
                  {/* <div className="mt-4 flex justify-center">
                    <button
                      onClick={handleDownload}
                      className="bg-[#5CC8DE] text-black px-4 py-2 rounded-md "
                    >
                      Download Image
                    </button>
                  </div> */}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MYEPK;
