"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function Section4() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showValidation, setShowValidation] = useState(false)
  const [isSurveyFinished, setIsSurveyFinished] = useState(false) // New state for finished flag

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

  const section41Questions = [
    "ไม่ทานอาหารขยะ",
    "อ่านฉลากอาหาร",
    "ทานอาหารเสริม",
    "ติดตามการกินของตนเองและปริมาณอาหารที่กิน",
    "ชั่งน้ำหนักและติดตามเป็นประจำ",
    "กินตลอดทั้งวัน",
  ]

  const yesNoOptions = ["ใช่", "ไม่ใช่", "ไม่แน่ใจ"]
  const healthOptions = ["น้ำหนักเกิน", "น้ำหนักปกติ", "น้ำหนักน้อยกว่าปกติ"]
  const energyOptions = ["เหนื่อยง่าย", "ปกติ", "กระตือรือร้น", "ผิดปกติ", "ไม่แน่ใจ"]

  // Check if all questions are answered
  const getAllQuestionIds = () => {
    const questionIds = []
    // Section 4.1 questions
    for (let i = 1; i <= section41Questions.length; i++) {
      questionIds.push(`section41_q${i}`)
    }
    // Section 4.2 and 4.3
    questionIds.push("section42", "section43")
    return questionIds
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

  // Update the handleNext function to scroll to the first unanswered question
  const handleNext = () => {
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
    // Navigate to next page
    window.location.href = "/section5"
  }

  const clearAllData = () => {
    sessionStorage.removeItem("surveyAnswers")
    setAnswers({})
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
              ส่วนที่ 4: ความรู้ ทักษะ และการรับรู้ด้านโภชนาการ
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
          {/* Section 4.1 */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
              4.1 เลือกกินหรือจะรักษาน้ำหนักอย่างมีสุขภาพดี
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="p-2 text-left text-xs sm:text-sm font-semibold text-gray-700 min-w-[120px] sm:min-w-[180px] md:min-w-[220px] lg:min-w-[250px]">
                      รายการ
                    </th>
                    {yesNoOptions.map((option, optionIndex) => (
                      <th
                        key={optionIndex}
                        className="p-2 text-center text-xs sm:text-sm font-semibold text-gray-700 min-w-[80px] sm:min-w-[100px] md:min-w-[120px]"
                      >
                        {option}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section41Questions.map((question, index) => {
                    const questionId = `section41_q${index + 1}`
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
                        <td className="p-2 text-xs sm:text-sm text-gray-800 font-medium">
                          {question}
                          {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                        </td>
                        {yesNoOptions.map((option, optionIndex) => (
                          <td key={optionIndex} className="p-1 text-center">
                            <div
                              onClick={() => handleAnswerChange(questionId, option)}
                              className={`flex items-center justify-center w-full h-full py-1.5 px-0.5 rounded-md cursor-pointer transition-all duration-200 border-2 ${
                                answers[questionId] === option
                                  ? "bg-blue-100 border-blue-500"
                                  : "border-transparent hover:bg-blue-50 hover:border-blue-200"
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 border-2 rounded-full flex items-center justify-center transition-all duration-200 ${
                                  answers[questionId] === option
                                    ? "border-blue-600 bg-blue-600"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {answers[questionId] === option && (
                                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
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
          </div>

          {/* Section 4.2 */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
              4.2 โดยรวมแล้วคุณคิดว่าสุขภาพของคุณเป็นอย่างไร
            </h2>

            <div
              id="section42"
              className={`space-y-2 sm:space-y-3 p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 ${
                showValidation && !answers["section42"] ? "bg-red-50 border-2 border-red-200" : "bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                {showValidation && !answers["section42"] && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto" />
                )}
              </div>
              {/* Changed to vertical layout and smaller options */}
              <div className="space-y-1.5 sm:space-y-2">
                {healthOptions.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    onClick={() => handleAnswerChange("section42", option)}
                    className={`flex items-start sm:items-center p-2 sm:p-2.5 md:p-3 border rounded-md sm:rounded-lg cursor-pointer transition-all duration-200 ${
                      answers["section42"] === option
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 rounded-full flex items-center justify-center mt-0.5 sm:mt-0 flex-shrink-0 transition-all duration-200 ${
                        answers["section42"] === option ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                      }`}
                    >
                      {answers["section42"] === option && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span
                      className={`ml-1.5 sm:ml-2 md:ml-2.5 text-xs sm:text-sm md:text-sm lg:text-base leading-relaxed ${
                        answers["section42"] === option ? "text-blue-700 font-medium" : "text-gray-700"
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4.3 */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
              4.3 คุณคิดว่าช่วงนี้คุณสามารถใช้ชีวิตประจำวันได้ตามปกติหรือไม่
            </h2>

            <div
              id="section43"
              className={`space-y-2 sm:space-y-3 p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 ${
                showValidation && !answers["section43"] ? "bg-red-50 border-2 border-red-200" : "bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                {showValidation && !answers["section43"] && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-auto" />
                )}
              </div>
              {/* Changed to vertical layout and smaller options */}
              <div className="space-y-1.5 sm:space-y-2">
                {energyOptions.map((option, optionIndex) => (
                  <div
                    key={optionIndex}
                    onClick={() => handleAnswerChange("section43", option)}
                    className={`flex items-start sm:items-center p-2 sm:p-2.5 md:p-3 border rounded-md sm:rounded-lg cursor-pointer transition-all duration-200 ${
                      answers["section43"] === option
                        ? "bg-blue-50 border-blue-300 shadow-sm"
                        : "border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 border-2 rounded-full flex items-center justify-center mt-0.5 sm:mt-0 flex-shrink-0 transition-all duration-200 ${
                        answers["section43"] === option ? "border-blue-600 bg-blue-600" : "border-gray-300 bg-white"
                      }`}
                    >
                      {answers["section43"] === option && (
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <span
                      className={`ml-1.5 sm:ml-2 md:ml-2.5 text-xs sm:text-sm md:text-sm lg:text-base leading-relaxed ${
                        answers["section43"] === option ? "text-blue-700 font-medium" : "text-gray-700"
                      }`}
                    >
                      {option}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white border-t shadow-sm w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="flex justify-between items-center">
            <Link
              href="/section3"
              className="flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 bg-gray-200 text-gray-700 rounded-md sm:rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mr-2 sm:mr-2.5" />
              <span>กลับ</span>
            </Link>
            <div className="flex gap-4">
              <button
                onClick={handleNext}
                className={`flex items-center px-5 sm:px-6 md:px-7 lg:px-9 py-3 sm:py-3.5 md:py-4 lg:py-5 rounded-md sm:rounded-lg transition-colors text-sm sm:text-base md:text-lg lg:text-xl font-medium shadow-lg hover:shadow-xl !border-none ${
                  isAllAnswered()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
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
