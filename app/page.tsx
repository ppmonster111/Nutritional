"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox" // Assuming shadcn/ui Checkbox component
import { useRouter } from "next/navigation" // Import useRouter
import { AlertCircle } from "lucide-react" // Import AlertCircle for warning icon

export default function Home() {
  const [isConsentChecked, setIsConsentChecked] = useState(false)
  const [showConsentWarning, setShowConsentWarning] = useState(false) // New state for warning message
  const router = useRouter() // Initialize useRouter

  const handleStartSurvey = () => {
    if (!isConsentChecked) {
      setShowConsentWarning(true)
    } else {
      setShowConsentWarning(false)
      // Clear all survey data from sessionStorage to ensure a fresh start
      sessionStorage.removeItem("surveyAnswers")
      sessionStorage.removeItem("isSurveyFinished") // Clear the finished flag as well
      router.push("/section2")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center items-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white p-8 sm:p-10 md:p-12 lg:p-16 rounded-lg shadow-lg space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight text-center">
          Case Record Form
        </h1>

        <div className="space-y-4 text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed">
          <p>
            แบบสอบถามข้อมูลการบริโภคและสุขภาพร่างกายและสุขภาพจิตใจของนักศึกษาแพทย์ชั้นปีที่ 4-6 ที่ศูนย์แพทย์ศึกษาชั้นคลินิกโรงพยาบาลลำปาง
            ปีการศึกษา 2568
          </p>

          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-6 mb-2">Consent Form</h3>
          <p>
            แบบฟอร์มยินยอมเข้าร่วมการศึกษา: ข้อมูลที่เก็บจะรวมถึงข้อมูลทั่วไป ข้อมูลพฤติกรรมการบริโภค ข้อมูลด้านความรู้ด้านโภชนาการ
            การประเมินความเครียดและสุขภาพจิต โดยยืนยันว่าข้อมูลทั้งหมดจะถูกเก็บเป็นความลับและไม่สามารถระบุถึงตัวตนของผู้ตอบได้
            ข้อมูลที่เก็บจะใช้เพื่อการศึกษาและวิจัยเท่านั้น โดยไม่มีการเผยแพร่ในรูปแบบที่สามารถระบุตัวตนได้
          </p>

          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-6 mb-2">วัตถุประสงค์</h3>
          <p>1. เพื่อศึกษาปัจจัยด้านภาวะโภชนาการที่มีผลต่อสุขภาวะทางกายของนักศึกษาแพทย์ชั้นคลินิกโรงพยาบาลลำปาง</p>
          <p>2. เพื่อศึกษาปัจจัยด้านภาวะโภชนาการที่มีผลต่อสุขภาวะทางจิตใจของนักศึกษาแพทย์ชั้นคลินิกโรงพยาบาลลำปาง</p>
        </div>

        <div className="flex items-center space-x-2 mt-8">
          <Checkbox
            id="consent"
            checked={isConsentChecked}
            onCheckedChange={(checked) => {
              setIsConsentChecked(!!checked)
              if (showConsentWarning && !!checked) {
                setShowConsentWarning(false) // Hide warning if consent is checked
              }
            }}
          />
          <label
            htmlFor="consent"
            className="text-sm sm:text-base md:text-lg font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            ยินยอม
          </label>
        </div>

        {showConsentWarning && (
          <div className="mt-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">กรุณากดยินยอมก่อนเริ่มทำแบบสอบถาม</h3>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={handleStartSurvey}
            className={`inline-flex items-center px-8 sm:px-10 py-3 sm:py-4 bg-blue-600 text-white rounded-md sm:rounded-lg transition-colors text-base sm:text-lg md:text-xl font-medium shadow-md hover:shadow-lg ${
              !isConsentChecked ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
            }`}
            disabled={!isConsentChecked && showConsentWarning} // Disable button if warning is shown and not consented
          >
            เริ่มทำแบบสอบถาม
          </button>
        </div>
      </div>
    </div>
  )
}
