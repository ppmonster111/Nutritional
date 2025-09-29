"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import liff from "@line/liff"
import { ensureUserAndSession } from "@/lib/surveySession"

export default function Home() {
  const router = useRouter()

  const [isConsentChecked, setIsConsentChecked] = useState(false)
  const [showConsentWarning, setShowConsentWarning] = useState(false)

  // สถานะสำหรับ LIFF (เพื่อ UX และกัน error)
  const [liffReady, setLiffReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // ---------- 1) เตรียม LIFF + ดึง line_user_id ถ้ามีอยู่แล้ว ----------
  useEffect(() => {
    ;(async () => {
      try {
        // 1. init LIFF (ไม่บังคับ login ที่นี่ ปล่อยให้กดปุ่มค่อย login)
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! })
        setLiffReady(true)

        // 2. ถ้า URL มี ?line_user_id=xxx (สำรองกรณีทดสอบ/ผ่านพารามิเตอร์)
        const lidFromUrl = new URLSearchParams(window.location.search).get("line_user_id")
        if (lidFromUrl) {
          sessionStorage.setItem("line_user_id", lidFromUrl)
        }

        // 3. ถ้ายังไม่มี line_user_id แต่ผู้ใช้ล็อกอินอยู่แล้ว (กลับมาหลัง login)
        let lid = sessionStorage.getItem("line_user_id") ?? ""
        if (!lid && liff.isLoggedIn()) {
          const p = await liff.getProfile()
          lid = p.userId
          sessionStorage.setItem("line_user_id", p.userId)
          sessionStorage.setItem("display_name", p.displayName ?? "")
          sessionStorage.setItem("picture_url", p.pictureUrl ?? "")
        }

        // 4. ถ้าได้ line_user_id แล้ว และยังไม่มี session_id ให้พยายามสร้าง session ไว้เลย (optional)
        if (lid && !sessionStorage.getItem("session_id")) {
          const display_name = sessionStorage.getItem("display_name") || undefined
          const picture_url = sessionStorage.getItem("picture_url") || undefined
          const { sessionId } = await ensureUserAndSession(lid, { display_name, picture_url })
          sessionStorage.setItem("session_id", sessionId)
        }
      } catch (e: any) {
        console.error("LIFF init / bootstrap failed:", e)
        setAuthError(e?.message ?? "LIFF initialize failed")
      }
    })()
  }, [])

  // ---------- 2) เริ่มทำแบบสอบถาม ----------
  const handleStartSurvey = async () => {
    if (!isConsentChecked) {
      setShowConsentWarning(true)
      return
    }
    setShowConsentWarning(false)

    try {
      // เคลียร์คำตอบเดิมให้เริ่มใหม่ทุกครั้ง
      sessionStorage.removeItem("surveyAnswers")
      sessionStorage.removeItem("isSurveyFinished")

      // เอา line_user_id จาก sessionStorage ก่อน
      let lid = sessionStorage.getItem("line_user_id") ?? ""

      // ถ้ายังไม่มี และ LIFF พร้อมแล้ว ให้พยายาม login / get profile
      if (!lid && liffReady) {
        if (!liff.isLoggedIn()) {
          // ส่งผู้ใช้ไป login LINE แล้วเด้งกลับมาหน้าเดิม
          liff.login({ redirectUri: window.location.href })
          return
        }
        const p = await liff.getProfile()
        lid = p.userId
        sessionStorage.setItem("line_user_id", p.userId)
        sessionStorage.setItem("display_name", p.displayName ?? "")
        sessionStorage.setItem("picture_url", p.pictureUrl ?? "")
      }

      // ถ้ายังไม่มีจริง ๆ ให้แจ้งเตือน
      if (!lid) {
        alert("ไม่พบ LINE user id กรุณาเข้าสู่ระบบด้วย LINE ก่อนเริ่มทำแบบสอบถาม")
        return
      }

      // เปิด/ดึง session ถ้ายังไม่มี
      if (!sessionStorage.getItem("session_id")) {
        const display_name = sessionStorage.getItem("display_name") || undefined
        const picture_url = sessionStorage.getItem("picture_url") || undefined
        const { sessionId } = await ensureUserAndSession(lid, { display_name, picture_url })
        sessionStorage.setItem("session_id", sessionId)
      }

      router.push("/section2")
    } catch (e) {
      console.error("start survey failed:", e)
      alert("เริ่มทำแบบสอบถามไม่สำเร็จ กรุณาลองใหม่")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center items-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white p-8 sm:p-10 md:p-12 lg:p-16 rounded-lg shadow-lg space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight text-center">
          Case Record Form
        </h1>

        {/* แจ้งสถานะ LIFF / Auth (ถ้าจำเป็น) */}
        {!liffReady && (
          <p className="text-sm text-gray-500">กำลังเตรียมระบบเข้าสู่ระบบด้วย LINE …</p>
        )}
        {authError && (
          <p className="text-sm text-red-600">เกิดข้อผิดพลาดในการเตรียม LIFF: {authError}</p>
        )}

        <div className="space-y-4 text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed">
          <p>
            แบบสอบถามข้อมูลการบริโภคและสุขภาพร่างกายและสุขภาพจิตใจของนักศึกษาแพทย์ชั้นปีที่ 4-6 ที่ศูนย์แพทย์ศึกษาชั้นคลินิกโรงพยาบาลลำปาง
            ปีการศึกษา 2568
          </p>

          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-6 mb-2">
            Consent Form
          </h3>
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
              if (showConsentWarning && !!checked) setShowConsentWarning(false)
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
              <h3 className="text-sm font-medium text-red-800">
                กรุณากดยินยอมก่อนเริ่มทำแบบสอบถาม
              </h3>
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
