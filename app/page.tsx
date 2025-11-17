"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [showConsentWarning, setShowConsentWarning] = useState(false);

  const handleStartSurvey = async () => {
    try {
      if (!isConsentChecked) {
        setShowConsentWarning(true);
        return;
      }
      setShowConsentWarning(false);

      router.push("/forms/health-survey-v2");
    } catch (e) {
      console.error("start survey failed:", e);
      alert("เริ่มทำแบบสอบถามไม่สำเร็จ กรุณาลองใหม่");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center items-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white p-8 sm:p-10 md:p-12 lg:p-16 rounded-lg shadow-lg space-y-6 sm:space-y-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight text-center">
          Case Record Form
        </h1>

        <div className="space-y-4 text-gray-700 text-sm sm:text-base md:text-lg leading-relaxed">
          <p>
            แบบสอบถามข้อมูลการบริโภคและสุขภาพร่างกายและสุขภาพจิตใจของนักศึกษาแพทย์ชั้นปีที่ 4-6
            ที่ศูนย์แพทย์ศึกษาชั้นคลินิกโรงพยาบาลลำปาง ปีการศึกษา 2568
          </p>

          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-6 mb-2">
            Consent Form
          </h3>
          <p>
            แบบฟอร์มยินยอมเข้าร่วมการศึกษา: ข้อมูลที่เก็บจะรวมถึงข้อมูลทั่วไป ข้อมูลพฤติกรรมการบริโภค
            ข้อมูลด้านความรู้ด้านโภชนาการ การประเมินความเครียดและสุขภาพจิต
            โดยยืนยันว่าข้อมูลทั้งหมดจะถูกเก็บเป็นความลับและไม่สามารถระบุถึงตัวตนของผู้ตอบได้
            ข้อมูลที่เก็บจะใช้เพื่อการศึกษาและวิจัยเท่านั้น โดยไม่มีการเผยแพร่ในรูปแบบที่สามารถระบุตัวตนได้
          </p>

          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mt-6 mb-2">
            วัตถุประสงค์
          </h3>
          <p>1. เพื่อศึกษาปัจจัยด้านภาวะโภชนาการที่มีผลต่อสุขภาวะทางกายของนักศึกษาแพทย์ชั้นคลินิกโรงพยาบาลลำปาง</p>
          <p>2. เพื่อศึกษาปัจจัยด้านภาวะโภชนาการที่มีผลต่อสุขภาวะทางจิตใจของนักศึกษาแพทย์ชั้นคลินิกโรงพยาบาลลำปาง</p>
        </div>

        <div className="flex items-center space-x-2 mt-8">
          <input
            id="consent"
            type="checkbox"
            checked={isConsentChecked}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const ok = e.target.checked;
              setIsConsentChecked(ok);
              if (showConsentWarning && ok) setShowConsentWarning(false);
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
            className={`inline-flex items-center px-8 sm:px-10 py-3 sm:py-4 rounded-md sm:rounded-lg text-base sm:text-lg md:text-xl font-medium shadow-md hover:shadow-lg transition-colors
              ${isConsentChecked ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-blue-600/50 text-white cursor-not-allowed"}`}
            disabled={!isConsentChecked}
            aria-disabled={!isConsentChecked}
          >
            เริ่มทำแบบประเมิน
          </button>
        </div>
      </div>
    </div>
  );
}
