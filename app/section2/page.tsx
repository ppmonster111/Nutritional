"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // New import for Textarea component
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"

export default function Section2() {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [showValidation, setShowValidation] = useState(false)
  const [bmi, setBmi] = useState<string | null>(null)
  const [bsa, setBsa] = useState<string | null>(null)
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

  // Calculate BMI and BSA
  useEffect(() => {
    const heightCm = Number.parseFloat(answers.height as string)
    const weightKg = Number.parseFloat(answers.weight as string)

    if (heightCm > 0 && weightKg > 0) {
      const heightM = heightCm / 100
      const calculatedBmi = weightKg / (heightM * heightM)
      setBmi(calculatedBmi.toFixed(2))

      // Du Bois formula for BSA: 0.007184 * W^0.425 * H^0.725
      const calculatedBsa = 0.007184 * Math.pow(weightKg, 0.425) * Math.pow(heightCm, 0.725)
      const bsaValue = calculatedBsa.toFixed(2)
      setBsa(bsaValue)
    } else {
      setBmi(null)
      setBsa(null)
    }
  }, [answers.height, answers.weight])

  // Function to get BMI color class
  const getBmiColorClass = (bmiValue: number | null) => {
    if (bmiValue === null) return "text-gray-700"
    if (bmiValue < 18.5) return "text-bmi-underweight"
    if (bmiValue >= 18.5 && bmiValue < 23) return "text-bmi-normal"
    if (bmiValue >= 23 && bmiValue < 25) return "text-bmi-overweight"
    if (bmiValue >= 25 && bmiValue < 30) return "text-bmi-obese1"
    if (bmiValue >= 30) return "text-bmi-obese2"
    return "text-gray-700"
  }

  // Function to get BMI status text
  const getBmiStatusText = (bmiValue: number | null) => {
    if (bmiValue === null) return ""
    if (bmiValue < 18.5) return "น้ำหนักน้อย"
    if (bmiValue >= 18.5 && bmiValue < 23) return "น้ำหนักปกติ"
    if (bmiValue >= 23 && bmiValue < 25) return "น้ำหนักเกิน"
    if (bmiValue >= 25 && bmiValue < 30) return "โรคอ้วน ระดับ 1"
    if (bmiValue >= 30) return "โรคอ้วน ระดับ 2"
    return ""
  }

  // Function to get BSA color class
  const getBsaColorClass = (bsaValue: number | null) => {
    if (bsaValue === null) return "text-gray-700"
    if (bsaValue < 1.4) return "text-bsa-small"
    if (bsaValue >= 1.4 && bsaValue <= 1.9) return "text-bsa-normal"
    if (bsaValue > 1.9) return "text-bsa-large"
    return "text-gray-700"
  }

  // Function to get BSA status text
  const getBsaStatusText = (bsaValue: number | null) => {
    if (bsaValue === null || isNaN(bsaValue)) {
      return ""
    }
    if (bsaValue < 1.4) {
      return "ร่างกายเล็ก"
    }
    if (bsaValue >= 1.4 && bsaValue <= 1.9) {
      return "ร่างกายปกติ"
    }
    if (bsaValue > 1.9) {
      return "ร่างกายใหญ่"
    }
    return ""
  }

  const handleAnswerChange = useCallback(
    (
      questionId: string,
      value: string | string[] | undefined,
      type: "input" | "radio" | "checkbox" | "other_input",
      questionConfig?: any, // Pass the full question config here for specific logic
    ) => {
      // Prevent saving if the survey is already marked as finished
      if (isSurveyFinished) {
        return
      }

      const newAnswers = { ...answers }

      if (type === "checkbox") {
        let currentValues = (newAnswers[questionId] || []) as string[]
        const isNoneOption = value === "ไม่มี"
        const isOtherOption = value === "อื่นๆ"

        if (isNoneOption) {
          if (currentValues.includes("ไม่มี")) {
            // "ไม่มี" is currently selected, and user is clicking it again (to deselect)
            currentValues = []
          } else {
            // "ไม่มี" is not selected, and user is selecting it
            currentValues = ["ไม่มี"]
          }
          // Always clear associated 'other' input if "ไม่มี" is involved
          if (questionConfig?.hasOther && newAnswers[questionConfig.otherInputId!]) {
            delete newAnswers[questionConfig.otherInputId!]
          }
        } else {
          // Clicked option is NOT "ไม่มี"
          // If "ไม่มี" was selected, deselect it first
          if (currentValues.includes("ไม่มี")) {
            currentValues = currentValues.filter((item) => item !== "ไม่มี")
          }

          if (currentValues.includes(value as string)) {
            // Deselect the clicked option
            currentValues = currentValues.filter((item) => item !== value)
            // If "อื่นๆ" is deselected, clear its input
            if (isOtherOption && questionConfig?.hasOther && newAnswers[questionConfig.otherInputId!]) {
              delete newAnswers[questionConfig.otherInputId!]
            }
          } else {
            // Select the clicked option
            currentValues = [...currentValues, value as string]
          }
        }
        newAnswers[questionId] = currentValues
      } else if (type === "radio") {
        if (value === undefined) {
          // Deselect current option
          delete newAnswers[questionId]
          // Clear associated input for surgery_history
          if (questionId === "surgery_history") {
            delete newAnswers["surgery_history_details"]
          }
        } else {
          // Select new option
          newAnswers[questionId] = value as string
          // Clear associated input if not selecting 'มี' for surgery_history
          if (questionId === "surgery_history" && value !== "มี") {
            delete newAnswers["surgery_history_details"]
          }
        }
      } else if (type === "input" || type === "other_input") {
        newAnswers[questionId] = value as string
      }

      setAnswers(newAnswers)
      // Only save to sessionStorage when navigating or finishing, not on every change
      sessionStorage.setItem("surveyAnswers", JSON.stringify(newAnswers))

      if (showValidation) {
        setShowValidation(false)
      }
    },
    [answers, isSurveyFinished, showValidation],
  )

  const generalQuestions = [
    { id: "age", label: "อายุ (ปี)", type: "input", inputType: "number", required: true },
    {
      id: "gender",
      label: "เพศ",
      type: "radio",
      options: ["ชาย", "หญิง"],
      required: true,
      layout: "flex flex-wrap gap-x-4 gap-y-2",
    },
    {
      id: "year",
      label: "ชั้นปี",
      type: "radio",
      options: ["ชั้นปีที่ 4", "ชั้นปีที่ 5", "ชั้นปีที่ 6"],
      required: true,
      layout: "flex flex-wrap gap-x-4 gap-y-2",
    },
    { id: "height", label: "ส่วนสูง (ซม.)", type: "input", inputType: "number", required: true },
    { id: "weight", label: "น้ำหนัก (กก.)", type: "input", inputType: "number", required: true },
    {
      id: "underlying_diseases",
      label: "โรคประจำตัว",
      type: "checkbox",
      options: [
        "ไม่มี",
        "Diabetes",
        "Hypertension",
        "Dyslipidemia",
        "Obesity",
        "Allergy",
        "Asthma",
        "Epilepsy",
        "Depression",
        "Sleep Apnea",
      ],
      hasOther: true,
      otherInputId: "underlying_diseases_other",
      required: true,
      layout: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2",
    },
    {
      id: "regular_medications",
      label: "ยาที่ใช้เป็นประจำ",
      type: "checkbox",
      options: [
        "ไม่มี",
        "Insulin",
        "Lipid/cholesterol-lowering",
        "Anti-hypertensive",
        "Anti-histamine",
        "Anti-depressant",
      ],
      hasOther: true,
      otherInputId: "regular_medications_other",
      required: true,
      layout: "grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2",
    },
    {
      id: "surgery_history",
      label: "ประวัติการผ่าตัด",
      type: "radio",
      options: ["มี", "ไม่มี"],
      hasOtherInput: true, // New property for radio with conditional input
      otherInputId: "surgery_history_details",
      required: true,
      layout: "flex flex-wrap gap-x-4 gap-y-2",
    },
    {
      id: "current_department",
      label: "ขณะนี้กำลังศึกษาอยู่แผนก/วอร์ดใด?",
      type: "radio",
      options: [
        "Med",
        "Surgery",
        "Pediatric",
        "Ob/Gyn",
        "Ortho",
        "ENT",
        "Eye",
        "ER",
        "Anes",
        "Rehab",
        "Radio",
        "Commed",
        "Fammed",
        "Psych",
        "Forensics",
      ],
      required: true,
      layout: "grid grid-cols-2 sm:grid-cols-3 gap-2", // Grid layout for many options
    },
  ]

  const getAnsweredQuestions = () => {
    let count = 0
    generalQuestions.forEach((q) => {
      if (q.type === "input") {
        if (answers[q.id] && (answers[q.id] as string).trim() !== "") {
          count++
        }
      } else if (q.type === "radio") {
        if (answers[q.id]) {
          count++
          if (q.hasOtherInput && answers[q.id] === "มี") {
            if (answers[q.otherInputId!] && (answers[q.otherInputId!] as string).trim() !== "") {
              // Counted if main radio is answered and other input is filled
            } else {
              // If 'มี' is selected but other input is empty, don't count as answered
              count--
            }
          }
        }
      } else if (q.type === "checkbox") {
        const selectedOptions = answers[q.id] as string[]
        if (selectedOptions && selectedOptions.length > 0) {
          if (q.hasOther && selectedOptions.includes("อื่นๆ")) {
            if (answers[q.otherInputId!] && (answers[q.otherInputId!] as string).trim() !== "") {
              count++
            }
          } else {
            count++
          }
        }
      }
    })
    return count
  }

  const getTotalQuestions = () => {
    return generalQuestions.length
  }

  const isAllAnswered = () => {
    for (const q of generalQuestions) {
      if (q.required) {
        if (q.type === "input") {
          if (!answers[q.id] || (answers[q.id] as string).trim() === "") {
            return false
          }
        } else if (q.type === "radio") {
          if (!answers[q.id]) {
            return false
          }
          if (q.hasOtherInput && answers[q.id] === "มี") {
            if (!answers[q.otherInputId!] || (answers[q.otherInputId!] as string).trim() === "") {
              return false
            }
          }
        } else if (q.type === "checkbox") {
          const selectedOptions = answers[q.id] as string[]
          if (!selectedOptions || selectedOptions.length === 0) {
            return false
          }
          if (q.hasOther && selectedOptions.includes("อื่นๆ")) {
            if (!answers[q.otherInputId!] || (answers[q.otherInputId!] as string).trim() === "") {
              return false
            }
          }
        }
      }
    }
    return true
  }

  const handleNext = () => {
    if (!isAllAnswered()) {
      setShowValidation(true)

      let firstUnansweredElement = null
      for (const q of generalQuestions) {
        const questionId = q.id
        let isQuestionAnswered = true

        if (q.type === "input") {
          if (!answers[questionId] || (answers[questionId] as string).trim() === "") {
            isQuestionAnswered = false
          }
        } else if (q.type === "radio") {
          if (!answers[questionId]) {
            isQuestionAnswered = false
          } else if (q.hasOtherInput && answers[questionId] === "มี") {
            if (!answers[q.otherInputId!] || (answers[q.otherInputId!] as string).trim() === "") {
              isQuestionAnswered = false
            }
          }
        } else if (q.type === "checkbox") {
          const selectedOptions = answers[q.id] as string[]
          if (!selectedOptions || selectedOptions.length === 0) {
            isQuestionAnswered = false
          } else if (q.hasOther && selectedOptions.includes("อื่นๆ")) {
            if (!answers[q.otherInputId!] || (answers[q.otherInputId!] as string).trim() === "") {
              isQuestionAnswered = false
            }
          }
        }

        if (!isQuestionAnswered && !firstUnansweredElement) {
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
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
      return
    }
    window.location.href = "/section3"
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 px-4 py-10 flex justify-center font-sans">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-5xl bg-white min-h-screen shadow-lg flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="flex items-center p-3 sm:p-4 md:p-5 lg:p-6">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium text-gray-900 leading-tight">
              ส่วนที่ 2: ข้อมูลทั่วไป
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
        <div className="flex-grow p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 space-y-2 sm:space-y-3 md:space-y-4">
          {" "}
          {/* Adjusted space-y */}
          {generalQuestions.map((q, index) => {
            const isQuestionAnswered = (() => {
              if (q.type === "input") {
                return answers[q.id] && (answers[q.id] as string).trim() !== ""
              } else if (q.type === "radio") {
                if (!answers[q.id]) return false
                if (q.hasOtherInput && answers[q.id] === "มี") {
                  return answers[q.otherInputId!] && (answers[q.otherInputId!] as string).trim() !== ""
                }
                return true
              } else if (q.type === "checkbox") {
                const selectedOptions = answers[q.id] as string[]
                if (!selectedOptions || selectedOptions.length === 0) return false
                if (q.hasOther && selectedOptions.includes("อื่นๆ")) {
                  return answers[q.otherInputId!] && (answers[q.otherInputId!] as string).trim() !== ""
                }
                return true
              }
              return false
            })()
            const isHighlighted = showValidation && !isQuestionAnswered

            return (
              <div
                key={q.id}
                id={q.id}
                className={`space-y-2 sm:space-y-3 p-3 sm:p-4 md:p-5 rounded-lg transition-all duration-200 shadow-sm ${
                  isHighlighted ? "bg-red-50 border-2 border-red-200" : "bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-xs sm:text-sm md:text-base lg:text-lg font-medium text-gray-900 leading-relaxed">
                    {index + 1}. {q.label}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  {isHighlighted && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 ml-2" />}
                </div>

                {q.type === "input" && (
                  <Input
                    id={q.id}
                    type={q.inputType}
                    {...(q.id === "age"
                      ? { min: 1, max: 100, step: 1, inputMode: "numeric", pattern: "[0-9]*" }
                      : q.id === "height"
                      ? { min: 1, max: 250, step: 1, inputMode: "numeric", pattern: "[0-9]*" }
                      : q.id === "weight"
                      ? { min: 1, max: 250, step: 1, inputMode: "numeric", pattern: "[0-9]*" }
                      : {})}
                    value={(answers[q.id] as string) || ""}
                    onChange={(e) => {
                      const rawValue = e.target.value
                      if (q.id === "age") {
                        let numericOnly = rawValue.replace(/[^0-9]/g, "")
                        if (numericOnly.length > 0) {
                          const clamped = Math.max(1, Math.min(100, Number.parseInt(numericOnly, 10)))
                          handleAnswerChange(q.id, String(clamped), "input")
                        } else {
                          handleAnswerChange(q.id, "", "input")
                        }
                      } else if (q.id === "height") {
                        let numericOnly = rawValue.replace(/[^0-9]/g, "")
                        if (numericOnly.length > 0) {
                          const clamped = Math.max(1, Math.min(250, Number.parseInt(numericOnly, 10)))
                          handleAnswerChange(q.id, String(clamped), "input")
                        } else {
                          handleAnswerChange(q.id, "", "input")
                        }
                      } else if (q.id === "weight") {
                        let numericOnly = rawValue.replace(/[^0-9]/g, "")
                        if (numericOnly.length > 0) {
                          const clamped = Math.max(1, Math.min(250, Number.parseInt(numericOnly, 10)))
                          handleAnswerChange(q.id, String(clamped), "input")
                        } else {
                          handleAnswerChange(q.id, "", "input")
                        }
                      } else {
                        handleAnswerChange(q.id, rawValue, "input")
                      }
                    }}
                    onKeyDown={(e) => {
                      if (q.id === "age" || q.id === "height" || q.id === "weight") {
                        if (["e", "E", "+", "-", "."].includes(e.key)) {
                          e.preventDefault()
                        }
                      }
                    }}
                    onWheel={(e) => {
                      if (q.id === "age" || q.id === "height" || q.id === "weight") {
                        ;(e.currentTarget as HTMLInputElement).blur()
                      }
                    }}
                    className={`mt-1 block ${
                    q.id === "age" || q.id === "height" || q.id === "weight" ? "w-full" : "w-20 sm:w-24 md:w-28"
                    } px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                )}

                {q.type === "radio" && (
                  <RadioGroup className={q.layout || "space-y-2"}>
                    {q.options?.map((option) => (
                      <div
                        key={option}
                        onClick={() => {
                          if (answers[q.id] === option) {
                            // If clicking the same option, deselect it
                            handleAnswerChange(q.id, undefined, "radio")
                          } else {
                            // If clicking a different option, select it
                            handleAnswerChange(q.id, option, "radio")
                          }
                        }}
                        className={`flex items-start sm:items-center p-2 sm:p-2.5 md:p-3 border rounded-md sm:rounded-lg cursor-pointer transition-all duration-200 ${
                          answers[q.id] === option
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <RadioGroupItem
                          value={option}
                          id={`${q.id}-${option}`}
                          checked={answers[q.id] === option}
                          className="mt-0.5 sm:mt-0 pointer-events-none"
                        />
                        <Label
                          htmlFor={`${q.id}-${option}`}
                          className="ml-2 text-sm sm:text-base cursor-pointer flex-1 pointer-events-none"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === "checkbox" && (
                  <div className={q.layout || "space-y-2"}>
                    {q.options?.map((option) => {
                      const isNoneOption = option === "ไม่มี"
                      const isNoneSelected = (answers[q.id] as string[] | undefined)?.includes("ไม่มี")
                      const isDisabled = isNoneSelected && !isNoneOption // Disable if "ไม่มี" is selected and this is not "ไม่มี"

                      return (
                        <div
                          key={option}
                          onClick={() => {
                            if (!isDisabled) {
                              handleAnswerChange(q.id, option, "checkbox", q) // Pass q here
                            }
                          }}
                          className={`flex items-center space-x-1.5 p-2 sm:p-2.5 md:p-3 border rounded-md sm:rounded-lg bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm cursor-pointer ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        >
                          <Checkbox
                            id={`${q.id}-${option}`}
                            checked={(answers[q.id] as string[] | undefined)?.includes(option)}
                            disabled={isDisabled} // Disable the actual checkbox input
                          />
                          <Label
                            htmlFor={`${q.id}-${option}`}
                            className={`text-xs sm:text-sm md:text-sm cursor-pointer ${
                              isDisabled ? "cursor-not-allowed" : ""
                            }`}
                          >
                            {option}
                          </Label>
                        </div>
                      )
                    })}
                    {q.hasOther && (
                      <div
                        onClick={() => {
                          const isNoneSelected = (answers[q.id] as string[] | undefined)?.includes("ไม่มี")
                          if (!isNoneSelected) {
                            handleAnswerChange(q.id, "อื่นๆ", "checkbox", q) // Pass q here
                          }
                        }}
                        className={`flex items-center space-x-1.5 p-2 sm:p-2.5 md:p-3 border rounded-md sm:rounded-lg bg-white hover:bg-gray-50 hover:border-blue-300 hover:shadow-sm cursor-pointer ${
                          (answers[q.id] as string[] | undefined)?.includes("ไม่มี")
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Checkbox
                          id={`${q.id}-อื่นๆ`}
                          checked={(answers[q.id] as string[] | undefined)?.includes("อื่นๆ")}
                          disabled={(answers[q.id] as string[] | undefined)?.includes("ไม่มี")} // Disable if "ไม่มี" is selected
                        />
                        <Label
                          htmlFor={`${q.id}-อื่นๆ`}
                          className={`text-xs sm:text-sm md:text-sm cursor-pointer ${
                            (answers[q.id] as string[] | undefined)?.includes("ไม่มี") ? "cursor-not-allowed" : ""
                          }`}
                        >
                          อื่นๆ
                        </Label>
                        {(answers[q.id] as string[] | undefined)?.includes("อื่นๆ") && (
                          // Prevent click on input from toggling checkbox
                          <Textarea
                            value={(answers[q.otherInputId!] as string) || ""}
                            onChange={(e) => handleAnswerChange(q.otherInputId!, e.target.value, "other_input", q)} // Pass q here
                            onClick={(e) => e.stopPropagation()} // Stop propagation for input clicks
                            placeholder="ระบุ"
                            className="ml-1.5 flex-grow px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[60px] resize-y"
                            disabled={(answers[q.id] as string[] | undefined)?.includes("ไม่มี")} // Disable input if "ไม่มี" is selected
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Conditional input for Surgery History details */}
                {q.id === "surgery_history" && answers.surgery_history === "มี" && (
                  <div className="mt-4">
                    <Label htmlFor={q.otherInputId!} className="text-sm md:text-base font-medium">
                      โปรดระบุรายละเอียดการผ่าตัด:
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Textarea
                      id={q.otherInputId!}
                      value={(answers[q.otherInputId!] as string) || ""}
                      onChange={(e) => handleAnswerChange(q.otherInputId!, e.target.value, "other_input")}
                      placeholder="เช่น ผ่าตัดไส้ติ่งเมื่อปี 2566"
                      className="mt-1 block w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-h-[80px] resize-y"
                    />
                  </div>
                )}

                {q.id === "weight" && bmi && (
                  <p className="text-sm md:text-base text-gray-700 mt-2">
                    BMI:{" "}
                    <span className={`font-semibold ${getBmiColorClass(Number.parseFloat(bmi))}`}>
                      {bmi} ({getBmiStatusText(Number.parseFloat(bmi))})
                    </span>
                  </p>
                )}
                {q.id === "weight" && bsa && (
                  <p className="text-sm md:text-base text-gray-700">
                    BSA:{" "}
                    <span className={`font-semibold ${getBsaColorClass(Number.parseFloat(bsa))}`}>
                      {bsa}
                      {getBsaStatusText(Number.parseFloat(bsa)) && (
                        <span> ({getBsaStatusText(Number.parseFloat(bsa))})</span>
                      )}
                    </span>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="bg-white border-t shadow-sm w-full mx-auto p-4 sm:p-5 md:p-6 lg:p-8">
          <div className="flex justify-between items-center">
            <Link
              href="/"
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
