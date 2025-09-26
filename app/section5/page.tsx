"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation" // Import useRouter

import { saveSection5Answers, finalizeSurvey } from "@/lib/surveySession"

export default function Section5() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [totalScore, setTotalScore] = useState(0)
  const [stressLevel, setStressLevel] = useState("")
  const [stressColor, setStressColor] = useState("")
  const [showValidation, setShowValidation] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isSurveyFinished, setIsSurveyFinished] = useState(false) // New state for finished flag

  const router = useRouter() // Initialize useRouter

  // Load answers and finished flag from sessionStorage on component mount
  useEffect(() => {
    const savedAnswers = sessionStorage.getItem("surveyAnswers")
    if (savedAnswers) {
      setAnswers(JSON.parse(savedAnswers))
    }
    const finishedFlag = sessionStorage.getItem("isSurveyFinished")
    if (finishedFlag === "true") {
      setIsSurveyFinished(true)
    }
  }, [])

  // Add this useEffect after the existing useEffect that loads answers from localStorage
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleAnswerChange = (questionId: string, value: string) => {
    // Prevent saving if the survey is already marked as finished
    if (isSurveyFinished) {
      return
    }

    const newAnswers = { ...answers }

    // If the same option is clicked again, remove it (deselect)
    if (answers[questionId] === value) {
      delete newAnswers[questionId]
    } else {
      // Otherwise, set the new value
      newAnswers[questionId] = value
    }

    setAnswers(newAnswers)
    // Only save to sessionStorage when navigating or finishing, not on every change
    sessionStorage.setItem("surveyAnswers", JSON.stringify(newAnswers))

    // Hide validation message when user starts answering
    if (showValidation) {
      setShowValidation(false)
    }
  }

  const questions = [
    "มีปัญหาการนอน นอนไม่หลับหรือนอนมาก",
    "มีสมาธิลดลง",
    "หงุดหงิด / กระวนกระวาย / ว้าวุ่นใจ",
    "รู้สึกเบื่อ เซ็ง",
    "ไม่อยากพบปะผู้คน",
  ]

  const options = [
    { value: "0", label: "0 เป็นบางครั้งหรือแทบไม่มี" },
    { value: "1", label: "1 เป็นบางครั้ง" },
    { value: "2", label: "2 บ่อยครั้ง" },
    { value: "3", label: "3 เป็นประจำ" },
  ]

  // Check if all questions are answered
  const getAllQuestionIds = () => {
    return questions.map((_, index) => `stress_q${index + 1}`)
  }

  const getAnsweredQuestions = () => {
    const allQuestionIds = getAllQuestionIds()
    return allQuestionIds.filter((id) => answers[id]).length
  }

  const getTotalQuestions = () => {
    return getAllQuestionIds().length
  }

  const isAllAnswered = () => {
    return getAnsweredQuestions() === getTotalQuestions()
  }

  // Update the handleFinish function to scroll to the first unanswered question
  const handleFinish = async () => {
    if (!isAllAnswered()) {
      setShowValidation(true)

      // Find the first unanswered question and scroll to it
      const allQuestionIds = getAllQuestionIds()
      let firstUnansweredElement = null

      for (const questionId of allQuestionIds) {
        if (!answers[questionId]) {
          firstUnansweredElement = document.getElementById(questionId)
          break
        }
      }

      if (firstUnansweredElement) {
        firstUnansweredElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      } else {
        // Fallback to scroll to top if element not found
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
      return
    }

    // Set the survey as finished in sessionStorage
    sessionStorage.setItem("isSurveyFinished", "true")
    setIsSurveyFinished(true) // Update local state

    // ✅ บันทึกให้เสร็จก่อน แล้วค่อย set finished + redirect
    const sessionId = sessionStorage.getItem("session_id") || ""

    // ถ้าใช้เวอร์ชันใหม่ (คำนวณคะแนนใน lib)
    const { total, stressLevel: level } = await saveSection5Answers(sessionId, answers)
    await finalizeSurvey(sessionId)

    // ค่อย mark ว่าเสร็จ
    sessionStorage.setItem("isSurveyFinished", "true")
    setIsSurveyFinished(true)

    router.push("/thank-you")

  }

  const clearAllData = () => {
    sessionStorage.removeItem("surveyAnswers")
    sessionStorage.removeItem("isSurveyFinished") // Clear the finished flag
    setAnswers({})
    setIsSurveyFinished(false) // Reset local state
  }

  const confirmReset = () => {
    // Check if survey is complete (all sections answered)
    const savedAnswers = sessionStorage.getItem("surveyAnswers")
    const allAnswers = savedAnswers ? JSON.parse(savedAnswers) : {}

    // Check if all sections (3, 4, 5) are complete
    const section3Complete =
      allAnswers["section1_q1"] &&
      allAnswers["section1_q2"] &&
      allAnswers["section1_q3"] &&
      allAnswers["section1_q4"] &&
      allAnswers["section1_q5"] &&
      allAnswers["section2_q1"] &&
      allAnswers["section2_q2"] &&
      allAnswers["section2_q3"] &&
      allAnswers["section2_q4"] &&
      allAnswers["section3_q1"] &&
      allAnswers["section3_q2"] &&
      allAnswers["section3_q3"] &&
      allAnswers["section3_q4"] &&
      allAnswers["section3_q5"]

    const section4Complete =
      allAnswers["section41_q1"] &&
      allAnswers["section41_q2"] &&
      allAnswers["section41_q3"] &&
      allAnswers["section41_q4"] &&
      allAnswers["section41_q5"] &&
      allAnswers["section41_q6"] &&
      allAnswers["section42"] &&
      allAnswers["section43"]

    const section5Complete =
      allAnswers["stress_q1"] &&
      allAnswers["stress_q2"] &&
      allAnswers["stress_q3"] &&
      allAnswers["stress_q4"] &&
      allAnswers["stress_q5"]

    const isFullyComplete = section3Complete && section4Complete && section5Complete

    if (isFullyComplete) {
      // Complete reset - clear everything
      sessionStorage.removeItem("surveyAnswers")
      sessionStorage.removeItem("isSurveyFinished") // Clear the finished flag
      setAnswers({})
      alert("รีเซ็ตแบบสำรวจทั้งหมดเรียบร้อยแล้ว")
    } else {
      // Partial reset - only current section
      const newAnswers = { ...allAnswers }
      // Remove section 5 answers
      questions.forEach((_, index) => {
        delete newAnswers[`stress_q${index + 1}`]
      })

      sessionStorage.setItem("surveyAnswers", JSON.stringify(newAnswers))
      setAnswers(newAnswers)
      alert("รีเซ็ตส่วนที่ 5 เรียบร้อยแล้ว")
    }

    setShowResetConfirm(false)
    setShowValidation(false)
    setIsSurveyFinished(false) // Reset local state
  }

  // Calculate total score and stress level
  useEffect(() => {
    const stressAnswers = Object.keys(answers)
      .filter((key) => key.startsWith("stress_"))
      .reduce((obj, key) => ({ ...obj, [key]: answers[key] }), {})

    const score = Object.values(stressAnswers).reduce((sum, value) => sum + Number.parseInt(value || "0"), 0)
    setTotalScore(score)

    if (score >= 0 && score <= 4) {
      setStressLevel("ความเครียดน้อย")
      setStressColor("green")
    } else if (score >= 5 && score <= 7) {
      setStressLevel("ความเครียดปานกลาง")
      setStressColor("yellow")
    } else if (score >= 8 && score <= 9) {
      setStressLevel("ความเครียดมาก")
      setStressColor("orange")
    } else if (score >= 10 && score <= 15) {
      setStressLevel("ความเครียดมากที่สุด")
      setStressColor("red")
    }
  }, [answers])

  const getStressColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return {
          bg: "bg-green-50",
          border: "border-green-500",
          text: "text-green-800",
          badge: "bg-green-100 text-green-800",
        }
      case "yellow":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-500",
          text: "text-yellow-800",
          badge: "bg-yellow-100 text-yellow-800",
        }
      case "orange":
        return {
          bg: "bg-orange-50",
          border: "border-orange-500",
          text: "text-orange-800",
          badge: "bg-orange-100 text-orange-800",
        }
      case "red":
        return {
          bg: "bg-red-50",
          border: "border-red-500",
          text: "text-red-800",
          badge: "bg-red-100 text-red-800",
        }
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-500",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-800",
        }
    }
  }

  const colorClasses = getStressColorClasses(stressColor)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
              ส่วนที่ 5: ความเครียด (ST5)
            </h1>
          </div>

          {/* Progress indicator */}
          <div className="px-3 sm:px-4 md:px-5 lg:px-6 pb-3">
            <div className="flex justify-between items-center text-xs sm:text-sm text-gray-600">
              <span>
                ความคืบหน้า: {getAnsweredQuestions()}/{getTotalQuestions()}
              </span>
              <span>{Math.round((getAnsweredQuestions() / getTotalQuestions()) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getAnsweredQuestions() / getTotalQuestions()) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Validation message */}
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
          {/* Instructions */}
          <div className="space-y-3 sm:space-y-4 bg-blue-50 p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border-l-4 border-blue-500">
            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-800">คำแนะนำการใช้งาน</h2>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
              ประเมินอาหารหรือความรู้สึกที่เกิดขึ้นในระยะ 2-4 สัปดาห์ความเครียดเกิดขึ้นได้กับทุกคน สาเหตุที่ทำให้เกิดความเครียดมีหลายอย่าง เช่น
              รายได้ที่ไม่เพียงพอหนี้สิน ภัยพิบัติต่างๆ ที่ทำให้เกิดความสูญเสีย ความเจ็บป่วย เป็นต้น
              ความเครียดมีทั้งประโยชน์และโทษหากมากเกินไปอาจส่งผลต่อร่างกายและจิตใจของท่านได้
            </p>
            <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed">
              โปรดอ่านข้อความแต่ละข้อแล้วตอบลงในช่องว่าง โดยให้ท่านลองประเมินตนเองโดยให้คะแนน 0-3 ที่ตรงกับอารมณ์ของท่านมากที่สุด
            </p>
            <div className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed font-medium space-y-1 bg-white p-3 sm:p-4 rounded-md border">
              <p>
                <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold flex-shrink-0">
                  0
                </span>{" "}
                หมายถึง เป็นบางครั้งหรือแทบไม่มี
              </p>
              <p>
                <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold flex-shrink-0">
                  1
                </span>{" "}
                หมายถึง เป็นบางครั้ง
              </p>
              <p>
                <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold flex-shrink-0">
                  2
                </span>{" "}
                หมายถึง บ่อยครั้ง
              </p>
              <p>
                <span className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 rounded-full text-xs font-bold flex-shrink-0">
                  3
                </span>{" "}
                หมายถึง เป็นประจำ
              </p>
            </div>
          </div>

          {/* Questions Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="p-1 text-left text-xs font-semibold text-gray-700 min-w-[100px] sm:min-w-[150px] md:min-w-[200px] lg:min-w-[250px]">
                    รายการ
                  </th>
                  {options.map((option, optionIndex) => (
                    <th
                      key={optionIndex}
                      className="p-1 text-center text-xs font-semibold text-gray-700 min-w-[50px] sm:min-w-[60px] md:min-w-[80px]"
                    >
                      {option.label.split(" ")[0]} {/* Display only the score (0, 1, 2, 3) */}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {questions.map((question, index) => {
                  const questionId = `stress_q${index + 1}`
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
                      <td className="p-1 text-xs text-gray-800 font-medium">
                        {index + 1}. {question}
                        {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                      </td>
                      {options.map((option) => (
                        <td key={option.value} className="p-0.5 text-center">
                          <div
                            onClick={() => handleAnswerChange(questionId, option.value)}
                            className={`flex items-center justify-center w-full h-full py-1 px-0.5 rounded-md cursor-pointer transition-all duration-200 border-2 ${
                              answers[questionId] === option.value
                                ? "bg-blue-100 border-blue-500"
                                : "border-transparent hover:bg-blue-50 hover:border-blue-200"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 border-2 rounded-full flex items-center justify-center transition-all duration-200 ${
                                answers[questionId] === option.value
                                  ? "border-blue-600 bg-blue-600"
                                  : "border-gray-300 bg-white"
                              }`}
                            >
                              {answers[questionId] === option.value && (
                                <div className="w-1 h-1 bg-white rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Score Summary */}
          <div
            className={`bg-gray-50 p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg space-y-2 sm:space-y-3 border-l-4 border-gray-400`}
          >
            <h3 className={`text-sm sm:text-base md:text-lg lg:text-xl font-medium text-gray-900`}>ผลการประเมิน</h3>
            <div className="space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700">
                <span className="font-medium">คะแนนรวม:</span>
                <span className={`ml-2 px-2 py-1 rounded-md font-bold ${colorClasses.badge}`}>{totalScore}</span>
              </p>
              <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-700">
                <span className="font-medium">ระดับความเครียด:</span>
                <span className={`ml-2 px-2 py-1 rounded-md font-bold ${colorClasses.badge}`}>{stressLevel}</span>
              </p>
              {totalScore >= 10 && (
                <div className="mt-3 sm:mt-4 p-2 sm:p-3 md:p-4 bg-red-100 border border-red-200 rounded-lg">
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg text-red-700 font-medium">
                    ⚠️ หมายเหตุ: ควรพบที่ปรึกษาเพื่อรับคำแนะนำ
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stress Level Criteria */}
          <div className="bg-gray-50 p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border-l-4 border-gray-400">
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-gray-900 mb-2 sm:mb-3">
              เกณท์การประเมิน
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm md:text-base lg:text-lg text-gray-700">
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <span className="w-9 h-9 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">
                  0-4
                </span>
                <span className="whitespace-nowrap">ความเครียดน้อย</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <span className="w-9 h-9 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-xs font-bold">
                  5-7
                </span>
                <span className="whitespace-nowrap">ความเครียดปานกลาง</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <span className="w-9 h-9 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">
                  8-9
                </span>
                <span className="whitespace-nowrap">ความเครียดมาก</span>
              </div>
              <div className="flex items-center space-x-2 p-2 bg-white rounded border">
                <span className="w-9 h-9 bg-red-100 text-red-800 rounded-full flex items-center justify-center text-xs font-bold">
                  10-15
                </span>
                <span className="whitespace-nowrap">ความเครียดมากที่สุด</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white border-t shadow-sm w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="flex justify-between">
            <Link
              href="/section4"
              className="flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-gray-200 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
              <span>กลับ</span>
            </Link>
            <button
              onClick={handleFinish}
              className={`flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 rounded-md sm:rounded-lg transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none ${
                isAllAnswered()
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              <span>เสร็จสิ้น</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
