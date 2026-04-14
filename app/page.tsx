'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen w-full h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 relative">
      {/* Animated Background Dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-indigo-400 animate-float"
            style={{
              width: `${Math.random() * 60 + 20}px`,
              height: `${Math.random() * 60 + 20}px`,
              left: `${Math.random() * 100}%`,
              bottom: `${-100 + Math.random() * 100}px`,
              opacity: 0.05 + Math.random() * 0.1,
              animationDelay: `${i * 4}s`,
              animationDuration: `${20 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      {/* Full Screen Content - Perfectly Centered */}
      <div className="h-full w-full flex flex-col relative z-10">
        {/* Logo Bar - Minimal */}
        <div className="flex-shrink-0 flex items-center justify-center px-4 py-1.5 border-b border-slate-100/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Sutra</h2>
          </div>
        </div>

        {/* Main Content Area - Vertically Centered */}
        <div className="flex-1 overflow-hidden px-4 md:px-8 lg:px-12 py-0">
          <div className="h-full w-full flex items-center justify-center">
            {/* CENTER - Hero & CTA - Full Width */}
            <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-1 md:gap-2 text-center">
              {/* Title */}
              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-slate-900 tracking-tight leading-tight -mt-2 md:-mt-3">
                Sutra
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-slate-600 -mt-1 md:-mt-1.5">
                Simple. Fast. Connected.
              </p>
              
              {/* Description */}
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-slate-500 max-w-lg mx-auto leading-snug mt-1 md:mt-2">
                Share your screen instantly. No login. No setup.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full max-w-md mt-4 md:mt-6">
                {/* Primary Button */}
                <Link href="/host" className="flex-1">
                  <button className="w-full px-6 py-3 sm:py-3 md:py-3 lg:py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-indigo-700 text-white text-base md:text-lg lg:text-lg font-semibold rounded-lg transition-all duration-300 transform hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white">
                    Start Hosting
                  </button>
                </Link>

                {/* Secondary Button */}
                <Link href="/viewer" className="flex-1">
                  <button className="w-full px-6 py-3 sm:py-3 md:py-3 lg:py-4 bg-white hover:bg-slate-50 text-slate-900 text-base md:text-lg lg:text-lg font-semibold rounded-lg border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-300 transform hover:shadow-lg hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-white">
                    Join as Viewer
                  </button>
                </Link>
              </div>

              {/* Feature Highlights */}
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-200/50">
                {/* Feature 1 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Ultra Fast</span>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Secure</span>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 10H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Multi-Viewer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Features - Shown only on mobile */}
      <div className="md:hidden flex-shrink-0 px-4 py-1.5 border-t border-slate-100 bg-white/30">
        <div className="flex gap-1 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 flex-shrink-0">
            <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-semibold text-indigo-900">Fast</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 border border-teal-200 flex-shrink-0">
            <svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-semibold text-teal-900">Secure</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 border border-purple-200 flex-shrink-0">
            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 10H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <span className="text-xs font-semibold text-purple-900">Multi</span>
          </div>
        </div>
      </div>
    </main>
  );
}
