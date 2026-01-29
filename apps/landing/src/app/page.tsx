"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const setupAudio = () => {
      if (audioContextRef.current) return;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(video);
      const gainNode = audioContext.createGain();
      
      gainNode.gain.value = 1.8;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
    };

    video.addEventListener('play', setupAudio, { once: true });
    
    return () => {
      video.removeEventListener('play', setupAudio);
    };
  }, []);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
      
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  };

  return (
    <main className="relative min-h-screen w-full font-[family-name:var(--font-poppins)]">
      {/* Background Image - Mobile */}
      <Image
        src="/capybaraMobileLanding.jpg"
        alt="Capybara studying in cozy room"
        fill
        className="object-cover object-center md:hidden"
        priority
      />
      {/* Background Image - Desktop */}
      <Image
        src="/capybaraLandscape.png"
        alt="Capybara studying in cozy room"
        fill
        className="object-cover object-center hidden md:block opacity-50"
        priority
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 md:px-8 md:py-4">
        <Image
          src="/focustownicon.png"
          alt="Focustown"
          width={64}
          height={64}
          className="w-12 h-12 md:w-16 md:h-16 rounded-xl"
        />
      </header>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-start pt-[12vh] md:pt-[14vh] px-3 md:px-4">
        {/* Main Header Card */}
        <div className="relative max-w-3xl w-full text-center">
          <Image
            src="/focustownlogo.png"
            alt="Focustown logo"
            width={560}
            height={180}
            className="absolute left-1/2 -translate-x-1/2 -top-12 sm:-top-14 md:-top-22 w-[300px] sm:w-[360px] md:w-[470px] h-auto z-20"
            priority
          />
          <div className="card px-4 pb-4 pt-10 md:px-8 md:py-6 w-full text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            <span className="text-[#78ADFD]">Your cozy corner </span>
            <span className="text-[#3D352A]">to </span>
            <span className="text-[#3D352A]"></span>
            <br />
            <span className="text-[#3D352A]"> lock in together</span>
          </h1>

          <p className="mt-8 text-[#9C9C9C] text-base md:text-xl font-medium">
            App is still in beta, join the Discord for updates!
          </p>

          {/* Discord Button */}
          <div className="mt-5 flex items-center justify-center mb-4">
            <a
              href="https://discord.gg/XbmKqmgdCb"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-discord flex items-center justify-center gap-2 w-[full] sm:w-auto px-8 h-[52px] md:h-[58px] md:w-[300px] text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Get Early Access
            </a>
          </div>
          </div>
        </div>

        {/* iPhone Outline + Autoplay Video */}
        <div className="mt-8 md:mt-10 flex items-center justify-center w-full">
          <div className="relative w-[220px] sm:w-[260px] md:w-[300px] aspect-[9/19.5]">
            <div className="absolute inset-0 rounded-[40px] border-[10px] border-[#1A1A1A] bg-[#0C0C0C] shadow-[0_20px_50px_rgba(0,0,0,0.2)]" />
            <div className="absolute inset-[14px] rounded-[28px] overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                src="/vid-cafeSelect.mp4"
                poster="/focusbanner.png"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
            {/* Sound Toggle Button */}
            <button
              onClick={toggleSound}
              className="absolute -top-4 -right-4 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-xl md:text-2xl hover:scale-110 transition-transform border-2 border-[#83715B]"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
