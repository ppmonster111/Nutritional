"use client"

import { useState, useEffect } from "react"
import { ArrowRight, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function Section3() {
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

  // Scroll to top when the component mounts
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
        "ชิมอาหารก่อนปรุง น้ำปลา ซีอิ้ว ซอส",
        "กินอาหารที่มีสมุนไพรหรือเครื่องเทศ เป็นส่วนประกอบ",
        "กินเนื้อสัตว์แปรรูป ไส้กรอก หมูยอ แฮม ปลาทูเค็ม กุ้งแห้ง ปลาร้า",
        "กินอาหารสำเร็จรูปหรืออาหารแช่แข็ง",
        "กินผักผลไม้ดองหรือผลไม้แช่อิ่ม",
      ],
    },
    {
      title: "3.3 ประเมินนิสัยการบริโภคโซเดียม",
      questions: [
        "เลือกกินเนื้อสัตว์ไม่ติดมัน ไม่ติดหนัง",
        "ทอดอาหาร ผัดอาหาร หรือใช้น้ำมัน",
        "กินอาหารจานเดียว ไขมันสูง หรืออาหารแกงกะทิ",
        "ดื่มเครื่องดื่มที่ผสมนมข้นหวาน ครีมเทียม วิปปิ้งครีม",
        "ซดน้ำผัก/น้ำแกง หรือ ราดน้ำผักน้ำแกงลงในข้าว",
      ],
    },
  ]

  const options = ["ทุกวัน/เกือบทุกวัน", "3-4 ต่อสัปดาห์", "แทบไม่ทำ/ไม่ทำเลย"]

  // Check if all questions are answered
  const getTotalQuestions = () => {
    return sections.reduce((total, section) => total + section.questions.length, 0)
  }

  const getAnsweredQuestions = () => {
    let count = 0
    sections.forEach((section, sectionIndex) => {
      section.questions.forEach((_, questionIndex) => {
        const questionId = `section${sectionIndex + 1}_q${questionIndex + 1}`
        if (answers[questionId]) {
          count++
        }
      })
    })
    return count
  }

  const isAllAnswered = () => {
    return getAnsweredQuestions() === getTotalQuestions()
  }

  // Update the handleNext function to scroll to the first unanswered question
  const handleNext = () => {
    if (!isAllAnswered()) {
      setShowValidation(true)

      // Find the first unanswered question and scroll to it
      let firstUnansweredElement = null
      sections.forEach((section, sectionIndex) => {
        section.questions.forEach((_, questionIndex) => {
          const questionId = `section${sectionIndex + 1}_q${questionIndex + 1}`
          if (!answers[questionId] && !firstUnansweredElement) {
            firstUnansweredElement = document.getElementById(questionId)
          }
        })
      })

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
    window.location.href = "/section4"
  }

  const clearAllData = () => {
    sessionStorage.removeItem("surveyAnswers")
    setAnswers({})
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
          <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
              ส่วนที่ 3: พฤติกรรมการบริโภค
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
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-4 sm:space-y-5 md:space-y-6">
              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-medium text-blue-600 leading-relaxed border-l-4 border-blue-500 pl-3 sm:pl-4">
                {section.title}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-gray-50 rounded-lg shadow-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="p-2 text-left text-xs sm:text-sm font-semibold text-gray-700 min-w-[120px] sm:min-w-[180px] md:min-w-[220px] lg:min-w-[250px]">
                        รายการ
                      </th>
                      {options.map((option, optionIndex) => (
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
                          <td className="p-2 text-xs sm:text-sm text-gray-800 font-medium">
                            {question}
                            {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 inline-block ml-2" />}
                          </td>
                          {options.map((option, optionIndex) => (
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
          ))}
        </div>

        {/* Navigation Buttons */}
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
