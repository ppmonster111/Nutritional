"use client"

import { useState, useEffect } from "react"
import { Utensils, BookOpen } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function SummaryPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({})

  // Load answers from sessionStorage
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem("surveyAnswers")
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers))
    }
  }, [])

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const calculateSection3Score = (sectionIndex: number) => {
    let score = 0
    const questions = 5

    for (let i = 1; i <= questions; i++) {
      const questionId = `section${sectionIndex + 1}_q${i}`
      const answer = answers[questionId]
      if (answer === "ทุกวัน/เกือบทุกวัน") score += 3
      else if (answer === "3-4 ต่อสัปดาห์") score += 2
      else if (answer === "แทบไม่ทำ/ไม่ทำเลย") score += 1
    }
    return score
  }

  const sugarScore = calculateSection3Score(0)
  const fatScore = calculateSection3Score(1)
  const sodiumScore = calculateSection3Score(2)

  const calculateStressScore = () => {
    let score = 0
    for (let i = 1; i <= 5; i++) {
      const questionId = `stress_q${i}`
      const answer = answers[questionId]
      if (answer) {
        score += Number.parseInt(answer)
      }
    }
    return score
  }

  const stressScore = calculateStressScore()

  const getSection3Message = (score: number, type: "sugar" | "fat" | "sodium") => {
    if (score === 5) {
      if (type === "sugar") return "ยินดีด้วย คุณบริโภคน้ำตาลในปริมาณที่พอเหมาะ"
      if (type === "fat") return "คุณมีความเสี่ยงน้อยในการได้รับผลเสียจากการบริโภคไขมันไม่เหมาะสม"
      if (type === "sodium") return "ยินดีด้วยคุณได้รับโซเดียมในปริมาณที่น้อย ทำดีแล้วนะ"
    } else if (score >= 6 && score <= 9) {
      if (type === "sugar") return "คุณมีความเสี่ยงปานกลางในแง่ของพฤติกรรมการบริโภคน้ำตาล"
      if (type === "fat") return "คุณมีความเสี่ยงปานกลางในการเลือกบริโภคไขมัน"
      if (type === "sodium") return "คุณได้รับโซเดียมในระดับปานกลาง ยังถือว่าไม่มีอันตรายอะไรมากต่อสุขภาพ"
    } else if (score >= 10 && score <= 13) {
      if (type === "sugar") return "คุณมีความเสี่ยงสูงในแง่ของพฤติกรรมการบริโภคน้ำตาล"
      if (type === "fat") return "คุณมีความเสี่ยงสูงในการเลือกบริโภคไขมัน"
      if (type === "sodium") return "คุณได้รับโซเดียมในปริมาณสูงแน่ๆ ถึงเวลาตระหนักถึงพฤติกรรมการบริโภคได้แล้ว"
    } else if (score >= 14 && score <= 15) {
      if (type === "sugar") return "รู้ตัวบ้างไหม? ว่าคุณมีความเสี่ยงสูงมาก กับการได้รับน้ำตาลเกิน"
      if (type === "fat") return "เฮ้อมือมิจูรษา!!!! คุณมีพฤติกรรมการบริโภคไขมันที่อันตรายต่อชีวิตคุณมาก"
      if (type === "sodium") return "คุณได้รับโซเดียมสูงมากกก แนะนำให้ปรับเปลี่ยนพฤติกรรมการบริโภคโดยด่วน"
    }
    return ""
  }

  const getStressMessage = (score: number) => {
    if (score >= 0 && score <= 4) return "ความเครียดน้อย"
    if (score >= 5 && score <= 7) return "ความเครียดปานกลาง"
    if (score >= 8 && score <= 9) return "ความเครียดมาก"
    if (score >= 10 && score <= 15) return "ความเครียดมากที่สุด"
    return ""
  }

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100
    if (percentage <= 33) return "bg-green-100 text-green-800 border-green-300"
    if (percentage <= 66) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    return "bg-red-100 text-red-800 border-red-300"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">สรุปผลการประเมิน</h1>
        </div>

        <div className="p-6 space-y-8">
          {/* Section 3 */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Utensils className="w-5 h-5 text-blue-600" />
              </div>
              ส่วนที่ 3: พฤติกรรมการบริโภค
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sugar */}
              <div className={`border-2 rounded-xl p-5 ${getScoreColor(sugarScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/candies-yHU2GBvOgqIfboeGIzin1EXolXzbwE.png"
                    alt="Candies"
                    width={20}
                    height={20}
                  />
                  <h3 className="font-semibold">การบริโภคหวาน</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{sugarScore} / 15</div>
                <p className="text-sm leading-relaxed">{getSection3Message(sugarScore, "sugar")}</p>
              </div>

              {/* Fat */}
              <div className={`border-2 rounded-xl p-5 ${getScoreColor(fatScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fat-V7zwtwaZDVOgykfi60KxdXiVoOWQlV.png"
                    alt="Fat"
                    width={20}
                    height={20}
                  />
                  <h3 className="font-semibold">การบริโภคไขมัน</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{fatScore} / 15</div>
                <p className="text-sm leading-relaxed">{getSection3Message(fatScore, "fat")}</p>
              </div>

              {/* Sodium */}
              <div className={`border-2 rounded-xl p-5 ${getScoreColor(sodiumScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sodium-XtUm0VmipFjvKOQF95kFkwRsDEuzEf.png"
                    alt="Sodium"
                    width={20}
                    height={20}
                  />
                  <h3 className="font-semibold">การบริโภคโซเดียม</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{sodiumScore} / 15</div>
                <p className="text-sm leading-relaxed">{getSection3Message(sodiumScore, "sodium")}</p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              ส่วนที่ 4: ความรู้และทักษะด้านโภชนาการ
            </h2>

            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
              <p className="text-green-800">คุณได้ทำการประเมินความรู้และทักษะด้านโภชนาการเรียบร้อยแล้ว</p>
            </div>
          </div>

          {/* Section 5 */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fear-FVLmM9Q5QYbTY8RkfGhowuCVCvvA45.png"
                  alt="Stress"
                  width={20}
                  height={20}
                />
              </div>
              ส่วนที่ 5: ความเครียด
            </h2>

            <div className={`border-2 rounded-xl p-6 ${getScoreColor(stressScore, 15)}`}>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold mb-2">{stressScore} / 15</div>
                <div className="text-lg font-semibold">{getStressMessage(stressScore)}</div>
              </div>
              {stressScore >= 10 && (
                <div className="mt-4 pt-4 border-t border-red-300">
                  <p className="text-sm font-medium text-center">
                    ระดับความเครียดของคุณอยู่ในเกณฑ์สูง ควรพบที่ปรึกษาหรือผู้เชี่ยวชาญเพื่อรับคำแนะนำ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t p-6">
          <Link
            href="/thank-you"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-lg font-semibold shadow-lg"
          >
            <span>เสร็จสิ้น</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
