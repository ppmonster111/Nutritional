"use client"

import { useState, useEffect } from "react"
import { ArrowRight, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { saveSection3Answers } from "@/lib/surveySession"

export default function Section3() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showValidation, setShowValidation] = useState(false)
  const [isSurveyFinished, setIsSurveyFinished] = useState(false)
  const [sugarScore, setSugarScore] = useState(0)
  const [fatScore, setFatScore] = useState(0)
  const [sodiumScore, setSodiumScore] = useState(0)

  useEffect(() => {
    const savedAnswers = sessionStorage.getItem("surveyAnswers")
    if (savedAnswers) setAnswers(JSON.parse(savedAnswers))
    const finishedFlag = sessionStorage.getItem("isSurveyFinished")
    if (finishedFlag === "true") setIsSurveyFinished(true)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    setSugarScore(calculateSectionScore(0))
    setFatScore(calculateSectionScore(1))
    setSodiumScore(calculateSectionScore(2))
  }, [answers])

  const handleAnswerChange = (questionId: string, value: string) => {
    if (isSurveyFinished) return
    const next = { ...answers }
    if (answers[questionId] === value) delete next[questionId]
    else next[questionId] = value
    setAnswers(next)
    sessionStorage.setItem("surveyAnswers", JSON.stringify(next))
    if (showValidation) setShowValidation(false)
  }

  const sections = [
    {
      title: "3.1 ประเมินนิสัยการบริโภคหวาน",
      questions: [
        "ดื่มน้ำเปล่า",
        "ดื่มน้ำอัดลม กาแฟ ชา น้ำหวาน นมเปรี้ยว",
        "ดื่มน้ำผักผลไม้สำเร็จรูป",
        "กินไอศกรีม เบเกอรี่ หรือขนมหวานไทย",
        "เติมน้ำตาลเพิ่มลงในอาหาร",
      ],
    },
    {
      title: "3.2 ประเมินนิสัยการบริโภคไขมัน",
      questions: [
        "เลือกกินเนื้อสัตว์ไม่ติดมัน ไม่ติดหนัง",
        "กินอาหารทอด อาหารฟาสต์ฟู้ด อาหารผัดน้ำมัน",
        "กินอาหารจานเดียว ไขมันสูง หรืออาหารประเภทแกงกะทิ",
        "ดื่มเครื่องดื่มที่ผสมนมข้นหวาน ครีมเทียม วิปปิ้งครีม",
        "ซดน้ำผัก/น้ำแกง หรือ ราดน้ำผักน้ำแกงลงในข้าว",
      ],
    },
    {
      title: "3.3 ประเมินนิสัยการบริโภคโซเดียม",
      questions: [
        "ชิมอาหารก่อนปรุง น้ำปลา ซีอิ้ว ซอส",
        "กินอาหารที่มีสมุนไพรหรือเครื่องเทศ เป็นส่วนประกอบ",
        "กินเนื้อสัตว์แปรรูป ไส้กรอก หมูยอ แฮม ปลาทูเค็ม กุ้งแห้ง ปลาร้า",
        "กินอาหารสำเร็จรูปหรืออาหารแช่แข็ง",
        "กินผักผลไม้ดองหรือผลไม้แช่อิ่ม",
      ],
    },
  ]

  const options = ["ทุกวัน/เกือบทุกวัน", "3-4 ต่อสัปดาห์", "แทบไม่ทำ/ไม่ทำเลย"]

  const calculateSectionScore = (sectionIndex: number) => {
    let score = 0
    sections[sectionIndex].questions.forEach((_, qIdx) => {
      const id = `section${sectionIndex + 1}_q${qIdx + 1}`
      const ans = answers[id]
      if (ans === "ทุกวัน/เกือบทุกวัน") score += 3
      else if (ans === "3-4 ต่อสัปดาห์") score += 2
      else if (ans === "แทบไม่ทำ/ไม่ทำเลย") score += 1
    })
    return score
  }

  const getScoreMessage = (score: number, type: "sugar" | "fat" | "sodium") => {
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

  const getScoreColor = (score: number) => {
    if (score === 5) return "green"
    if (score >= 6 && score <= 9) return "yellow"
    if (score >= 10 && score <= 13) return "orange"
    if (score >= 14 && score <= 15) return "red"
    return "gray"
  }

  const getScoreColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return { bg: "bg-green-50", border: "border-green-500", text: "text-green-800", badge: "bg-green-100 text-green-800" }
      case "yellow":
        return { bg: "bg-yellow-50", border: "border-yellow-500", text: "text-yellow-800", badge: "bg-yellow-100 text-yellow-800" }
      case "orange":
        return { bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-800", badge: "bg-orange-100 text-orange-800" }
      case "red":
        return { bg: "bg-red-50", border: "border-red-500", text: "text-red-800", badge: "bg-red-100 text-red-800" }
      default:
        return { bg: "bg-gray-50", border: "border-gray-500", text: "text-gray-800", badge: "bg-gray-100 text-gray-800" }
    }
  }

  const getTotalQuestions = () => sections.reduce((t, s) => t + s.questions.length, 0)
  const getAnsweredQuestions = () => {
    let c = 0
    sections.forEach((s, si) =>
      s.questions.forEach((_, qi) => {
        const id = `section${si + 1}_q${qi + 1}`
        if (answers[id]) c++
      }),
    )
    return c
  }
  const isAllAnswered = () => getAnsweredQuestions() === getTotalQuestions()

  const handleNext = async () => {
    if (!isAllAnswered()) {
      setShowValidation(true)
      let first: HTMLElement | null = null
      sections.forEach((s, si) =>
        s.questions.forEach((_, qi) => {
          const id = `section${si + 1}_q${qi + 1}`
          if (!answers[id] && !first) first = document.getElementById(id)
        }),
      )
      if (first && typeof (first as HTMLElement).scrollIntoView === "function") {
        ;(first as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" })
      }
      else window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    const sessionId = sessionStorage.getItem("session_id") || ""
    await saveSection3Answers(sessionId, answers)
    window.location.href = "/section4"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
              ส่วนที่ 3: พฤติกรรมการบริโภค
            </h1>
          </div>

          {/* Progress */}
          <div className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3">
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
              <span>ความคืบหน้า: {getAnsweredQuestions()}/{getTotalQuestions()}</span>
              <span>{Math.round((getAnsweredQuestions() / getTotalQuestions()) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredQuestions() / getTotalQuestions()) * 100}%` }}
              />
            </div>
          </div>

          {/* Validation */}
          {showValidation && (
            <div className="mx-3 sm:mx-4 md:mx-5 lg:mx-6 mb-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">กรุณาตอบคำถามให้ครบทุกข้อ</h3>
                  <p className="text-xs text-red-700 mt-1">
                    คุณยังไม่ได้ตอบคำถาม {getTotalQuestions() - getAnsweredQuestions()} ข้อ
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-grow p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 space-y-6 sm:space-y-7 md:space-y-8 lg:space-y-10">
          {sections.map((section, sectionIndex) => {
            const sectionScore = sectionIndex === 0 ? sugarScore : sectionIndex === 1 ? fatScore : sodiumScore
            const sectionType = sectionIndex === 0 ? "sugar" : sectionIndex === 1 ? "fat" : "sodium"
            const scoreColor = getScoreColor(sectionScore)
            const colorClasses = getScoreColorClasses(scoreColor)
            const scoreMessage = getScoreMessage(sectionScore, sectionType)

            return (
              <div key={sectionIndex} className="space-y-4 sm:space-y-5 md:space-y-6">
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                  {section.title}
                </h2>

                {/* ตารางเหมือน desktop แต่ปุ่มตัวเลือกไม่มีข้อความ */}
                <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm table-fixed">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="p-2 text-left text-[11px] sm:text-sm font-semibold text-gray-700 w-1/2 break-words leading-snug">
                        รายการ
                      </th>
                      {options.map((option, idx) => (
                        <th
                          key={idx}
                          className="p-2 text-center text-[11px] sm:text-sm font-semibold text-gray-700 w-1/6 break-words leading-snug"
                        >
                          {option}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.questions.map((question, questionIndex) => {
                      const questionId = `section${sectionIndex + 1}_q${questionIndex + 1}`
                      const isAnswered = !!answers[questionId]
                      const isHighlighted = showValidation && !isAnswered
                      return (
                        <tr
                          key={questionId}
                          id={questionId}
                          className={`border-b border-gray-200 last:border-b-0 transition-all duration-200 ${
                            isHighlighted ? "bg-red-50" : "hover:bg-white"
                          }`}
                        >
                          <td className="p-2 text-[12px] sm:text-sm text-gray-800 font-medium break-words leading-snug">
                            {question}
                            {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                          </td>
                          {options.map((option, i) => (
                            <td key={i} className="p-1 text-center align-middle">
                              <button
                                type="button"
                                onClick={() => handleAnswerChange(questionId, option)}
                                aria-label={option}
                                title={option}
                                className={`w-full h-full py-1.5 px-0.5 rounded-md border-2 transition-all flex items-center justify-center ${
                                  answers[questionId] === option
                                    ? "bg-blue-100 border-blue-500"
                                    : "border-transparent hover:bg-blue-50 hover:border-blue-200"
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 border-2 rounded-full flex items-center justify-center transition-all ${
                                    answers[questionId] === option
                                      ? "border-blue-600 bg-blue-600"
                                      : "border-gray-300 bg-white"
                                  }`}
                                >
                                  {answers[questionId] === option && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                  )}
                                </div>
                                <span className="sr-only">{option}</span>
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div className={`${colorClasses.bg} p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg space-y-2 sm:space-y-3 border-l-4 ${colorClasses.border}`}>
                  <h3 className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium ${colorClasses.text}`}>ผลการประเมิน</h3>
                  <div className="space-y-1 sm:space-y-2">
                    <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${colorClasses.text}`}>
                      <span className="font-medium">คะแนน:</span>
                      <span className={`ml-2 px-2 py-1 rounded-md font-bold ${colorClasses.badge}`}>{sectionScore}</span>
                    </p>
                    {scoreMessage && (
                      <p className={`text-xs sm:text-sm md:text-base lg:text-lg ${colorClasses.text} leading-relaxed`}>{scoreMessage}</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        <div className="bg-white border-t shadow-sm w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="flex justify-between items-center">
            <Link
              href="/section2"
              className="flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-gray-200 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
              <span>กลับ</span>
            </Link>
            <div className="flex gap-4">
              <button
                onClick={handleNext}
                className={`flex items-center px-6 sm:px-7 md:px-8 lg:px-10 py-3 sm:py-3.5 md:py-4 lg:py-5 rounded-md sm:rounded-lg transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none ${
                  isAllAnswered() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                <span>ถัดไป</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ml-2 sm:ml-2.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
