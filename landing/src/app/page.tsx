"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle early access signup
    console.log("Phone submitted:", phone);
  };

  return (
    <main className="relative min-h-screen w-full font-[family-name:var(--font-poppins)]">
      {/* Background Image - Mobile */}
      <Image
        src="/capybaraMobileLanding.png"
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
        className="object-cover object-center hidden md:block"
        priority
      />

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col items-center pt-4 md:pt-[15vh] px-3 md:px-4">
        {/* Main Header Card */}
        <div className="card px-4 py-4 md:px-8 md:py-6 max-w-2xl w-full text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            <span className="text-[#78ADFD]">Focusing </span>
            <span className="text-[#3D352A]">feels better</span>
            <br />
            <span className="text-[#3D352A]">with </span>
            <span className="underline-blue">friends</span>
            <span className="text-[#3D352A]">.</span>
          </h1>

          <p className="mt-3 text-[#9C9C9C] text-base md:text-xl font-medium">
            Study live with homies around the world
          </p>

          {/* Form - Inside Card */}
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col sm:flex-row gap-2 items-center justify-center">
            <div className="input-field h-[52px] md:h-[58px] w-full sm:w-[320px] flex items-center justify-center">
              <input
                type="tel"
                placeholder="+1201-555-555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn-primary whitespace-nowrap w-full sm:w-auto h-[52px] md:h-[58px] text-base"
            >
              Get Early Access
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
