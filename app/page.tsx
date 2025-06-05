import Link from "next/link"
import { FaBolt, FaFileAlt, FaUserFriends } from "react-icons/fa"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative px-2">
      {/* Logo always at the top left */}
      <img
        src="/light.webp"
        alt="EOXS Logo"
        className="absolute top-4 left-4 h-8 w-auto sm:h-10"
        style={{ maxWidth: "30vw" }}
      />

      <main className="z-10 flex flex-col items-center w-full pt-20">
        <h1 className="text-xl sm:text-4xl md:text-5xl font-bold mb-4 text-center text-gray-900 drop-shadow">
          Welcome to your personal Ai- Assistant
        </h1>
        <p className="text-sm sm:text-lg text-gray-600 mb-8 sm:mb-10 text-center max-w-xs sm:max-w-xl">
          Your smart companion for technology and productivity. Ask anything, upload documents, and get instant, personalized support.
        </p>

        {/* Flash cards */}
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 mb-8 sm:mb-12 w-full max-w-4xl">
          <div className="bg-white shadow-xl rounded-2xl p-5 sm:p-7 flex-1 text-center border border-gray-100 hover:shadow-2xl transition group min-w-[220px]">
            <div className="flex justify-center mb-2 sm:mb-3">
              <FaBolt className="text-primary text-2xl sm:text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Instant Answers</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Get quick, accurate responses to your questions about technology, and more.
            </p>
          </div>
          <div className="bg-white shadow-xl rounded-2xl p-5 sm:p-7 flex-1 text-center border border-gray-100 hover:shadow-2xl transition group min-w-[220px]">
            <div className="flex justify-center mb-2 sm:mb-3">
              <FaFileAlt className="text-primary text-2xl sm:text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Document Insights</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Upload documents and let the assistant extract, summarize, and explain key information.
            </p>
          </div>
          <div className="bg-white shadow-xl rounded-2xl p-5 sm:p-7 flex-1 text-center border border-gray-100 hover:shadow-2xl transition group min-w-[220px]">
            <div className="flex justify-center mb-2 sm:mb-3">
              <FaUserFriends className="text-primary text-2xl sm:text-3xl group-hover:scale-110 transition" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">Personalized Support</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Enjoy a tailored experience that learns from your interactions and adapts to your needs.
            </p>
          </div>
        </div>

        <Link href="/chat" className="w-full flex justify-center">
          <button className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-xl text-lg sm:text-xl font-bold shadow-lg hover:scale-105 hover:bg-gray-900 transition-all duration-200">
            Chat
          </button>
        </Link>
      </main>
    </div>
  )
}
