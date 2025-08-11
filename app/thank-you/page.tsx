"use client"

import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex flex-col items-center justify-center font-sans text-center">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white p-8 sm:p-10 md:p-12 lg:p-16 rounded-lg shadow-lg space-y-6 sm:space-y-8">
        <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 mx-auto" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
          สำเร็จระบบได้บันทึกคำตอบของคุณแล้ว
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed">
          ขอขอบคุณสำหรับความร่วมมือของคุณในการดูแลสุขภาพ และเราหวังว่าคุณจะได้รับประสบการณ์ที่ดีจากระบบบริการของเรา
        </p>
        <Link
          href="/" // Updated href to point to the root path
          className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-md sm:rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base md:text-lg font-medium shadow-md hover:shadow-lg"
        >
          กลับสู่หน้าหลัก
        </Link>
      </div>
    </div>
  )
}
