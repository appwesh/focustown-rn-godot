"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownloadClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
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
            className="absolute left-1/2 -translate-x-1/2 -top-8 md:-top-22 w-[380px] md:w-[470px] h-auto z-20"
            priority
          />
          <div className="card px-4 py-4 md:px-8 md:py-6 w-full text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            <span className="text-[#78ADFD]">Your cozy corner </span>
            <span className="text-[#3D352A]">to </span>
            <span className="text-[#3D352A]"></span>
            <br />
            <span className="text-[#3D352A]"> lock in together</span>
          </h1>

          <p className="mt-3 text-[#9C9C9C] text-base md:text-xl font-medium">
            Study live with homies around the world
          </p>

          {/* Download Buttons */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <button
              onClick={handleDownloadClick}
              className="btn-apple flex items-center justify-center gap-2 w-full sm:w-auto h-[52px] md:h-[58px] text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Download on iOS
            </button>
            <button
              onClick={handleDownloadClick}
              className="btn-android flex items-center justify-center gap-2 w-full sm:w-auto h-[52px] md:h-[58px] text-base"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 20.5v-11c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v11c0 .83-.67 1.5-1.5 1.5S3 21.33 3 20.5zm4-13v11c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19.5h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19.5h1c.55 0 1-.45 1-1v-11H7zm11.5 0c-.83 0-1.5.67-1.5 1.5v11c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5zM15.53 2.16l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
              </svg>
              Download on Android
            </button>
          </div>
          </div>
        </div>

        {/* iPhone Outline + Autoplay Video */}
        <div className="mt-8 md:mt-10 flex items-center justify-center w-full">
          <div className="relative w-[220px] sm:w-[260px] md:w-[300px] aspect-[9/19.5]">
            <div className="absolute inset-0 rounded-[40px] border-[10px] border-[#1A1A1A] bg-[#0C0C0C] shadow-[0_20px_50px_rgba(0,0,0,0.2)]" />
            <div className="absolute inset-[14px] rounded-[28px] overflow-hidden bg-black">
              <video
                className="w-full h-full object-cover"
                src="/landing-demo.mp4"
                poster="/focusbanner.png"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </div>
            <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[120px] h-[24px] rounded-full bg-black" />
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={handleModalClose}
        >
          <div
            className="modal-card card px-6 py-6 md:px-8 md:py-8 max-w-md w-full text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleModalClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-[#83715B] hover:text-[#3D352A] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#3D352A]">
              Focustown needs your help!
            </h2>
            <p className="mt-2 text-[#9C9C9C] text-sm md:text-base font-medium">
              We're still under development, join the community to get beta access + exclusive rewards
            </p>

            <a
              href="https://discord.gg/XbmKqmgdCb"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-discord flex items-center justify-center gap-2 w-full h-[52px] md:h-[58px] text-base mt-5"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Join Server
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
