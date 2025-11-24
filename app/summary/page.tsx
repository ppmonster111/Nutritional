'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Utensils, BookOpen } from 'lucide-react'

type Ans = Record<string, any>
const read = (k: string) => {
  try { return JSON.parse(sessionStorage.getItem(k) || '{}') } catch { return {} }
}

// --- helpers ---
const firstOf = (obj: Ans, keys: string[]) => keys.find(k => obj[k] !== undefined) ? obj[keys.find(k => obj[k] !== undefined)!] : undefined

const normChoice = (v: any): string => {
  const s = String(v ?? '').trim()
  // ทำให้คำตอบที่สะกดต่างกันเล็กน้อยมารวมกัน
  if (/ทุกวัน/.test(s)) return 'ทุกวัน/เกือบทุกวัน'
  if (/(3-4).*(สัปดาห์)/.test(s)) return '3-4 ครั้งต่อสัปดาห์'
  if (/แทบไม่ทำ|ไม่ทำเลย/.test(s)) return 'แทบไม่ทำ/ไม่ทำเลย'
  return s
}

const triToScore = (v: any): number => {
  const s = normChoice(v)
  if (s === 'ทุกวัน/เกือบทุกวัน') return 3
  if (s === '3-4 ครั้งต่อสัปดาห์') return 2
  if (s === 'แทบไม่ทำ/ไม่ทำเลย') return 1
  const n = Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

const sum = (ns: number[]) => ns.reduce((t, n) => t + n, 0)

export default function SummaryPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<Ans>({})

  useEffect(() => setAnswers(read('surveyAnswers')), [])

  // รองรับทั้งคีย์แบบ diet31_q1..q5 และ section1_q1..q5
  const dietTotal = (prefixes: string[]) =>
    sum(
      Array.from({ length: 5 }, (_, i) => i + 1).map(i => {
        const v = firstOf(answers, prefixes.map(p => `${p}_q${i}`))
        return triToScore(v)
      })
    )

  const sugarScore = useMemo(() => dietTotal(['diet31', 'section1']), [answers])
  const fatScore = useMemo(() => dietTotal(['diet32', 'section2']), [answers])
  const sodiumScore = useMemo(() => dietTotal(['diet33', 'section3']), [answers])

  // ST-5: รองรับ st5_q* และ stress_q*
  const stressScore = useMemo(() => {
    return sum(
      Array.from({ length: 5 }, (_, i) => i + 1).map(i => {
        const raw = firstOf(answers, [`st5_q${i}`, `stress_q${i}`])
        const n = Number.parseInt(String(raw ?? 0), 10)
        return Number.isFinite(n) ? n : 0
      })
    )
  }, [answers])

  const section3Msg = (score: number, type: 'sugar' | 'fat' | 'sodium') => {
    if (score === 5) {
      if (type === 'sugar') return 'ยอดเยี่ยม บริโภคน้ำตาลในระดับเหมาะสม'
      if (type === 'fat') return 'ไขมันอยู่ในเกณฑ์ดี'
      return 'โซเดียมอยู่ในเกณฑ์น้อย ทำได้ดีต่อเนื่อง'
    }
    if (score <= 9) return 'ความเสี่ยงปานกลาง ลองปรับพฤติกรรมทีละนิด'
    if (score <= 13) return 'ความเสี่ยงสูง ควรจำกัดปริมาณและอ่านฉลากโภชนาการ'
    return 'เสี่ยงสูงมาก ควรปรับทันที เลี่ยงหวาน/มัน/เค็มเป็นหลัก'
  }

  const stressMsg = (s: number) =>
    s <= 4 ? 'ความเครียดน้อย'
      : s <= 7 ? 'ความเครียดปานกลาง'
        : s <= 9 ? 'ความเครียดมาก'
          : 'ความเครียดมากที่สุด'

  const badge = (score: number, max: number) => {
    const pct = (score / max) * 100
    if (pct <= 33) return 'bg-green-100 text-green-800 border-green-300'
    if (pct <= 66) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const onConfirm = async () => {
    // ถ้ามี API submit ของโปรเจกต์ ให้ส่งก่อน แล้วค่อยไป thank-you
    // await fetch('/api/form/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(answers) }).catch(()=>{})
    router.push('/thank-you')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8 flex justify-center">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold mb-2">สรุปผลการประเมิน</h1>
          <p className="opacity-90">ตรวจทานข้อมูลอีกครั้งก่อนยืนยันส่งแบบฟอร์ม</p>
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
              <div className={`border-2 rounded-xl p-5 ${badge(sugarScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/candies-yHU2GBvOgqIfboeGIzin1EXolXzbwE.png" alt="Candies" width={20} height={20} />
                  <h3 className="font-semibold">การบริโภคหวาน</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{sugarScore} / 15</div>
                <p className="text-sm leading-relaxed">{section3Msg(sugarScore, 'sugar')}</p>
              </div>

              <div className={`border-2 rounded-xl p-5 ${badge(fatScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fat-V7zwtwaZDVOgykfi60KxdXiVoOWQlV.png" alt="Fat" width={20} height={20} />
                  <h3 className="font-semibold">การบริโภคไขมัน</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{fatScore} / 15</div>
                <p className="text-sm leading-relaxed">{section3Msg(fatScore, 'fat')}</p>
              </div>

              <div className={`border-2 rounded-xl p-5 ${badge(sodiumScore, 15)}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sodium-XtUm0VmipFjvKOQF95kFkwRsDEuzEf.png" alt="Sodium" width={20} height={20} />
                  <h3 className="font-semibold">การบริโภคโซเดียม</h3>
                </div>
                <div className="text-3xl font-bold mb-2">{sodiumScore} / 15</div>
                <p className="text-sm leading-relaxed">{section3Msg(sodiumScore, 'sodium')}</p>
              </div>
            </div>
          </div>

          {/* Section 4 (placeholder) */}
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
                <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/fear-FVLmM9Q5QYbTY8RkfGhowuCVCvvA45.png" alt="Stress" width={20} height={20} />
              </div>
              ส่วนที่ 5: ความเครียด
            </h2>

            <div className={`border-2 rounded-xl p-6 ${badge(stressScore, 15)}`}>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold mb-2">{stressScore} / 15</div>
                <div className="text-lg font-semibold">{stressMsg(stressScore)}</div>
              </div>
              {stressScore >= 10 && (
                <div className="mt-4 pt-4 border-t border-red-300">
                  <p className="text-sm font-medium text-center">
                    ระดับความเครียดค่อนข้างสูง แนะนำปรึกษาผู้เชี่ยวชาญเพื่อรับคำแนะนำเพิ่มเติม
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t p-6 flex flex-col md:flex-row gap-3">
          {/* ปุ่มกลับไปแก้ (เปลี่ยนเส้นทางตามโครงฟอร์มจริงของน้อง) */}
          <Link href="/form/health-survey-v2" className="flex-1 text-center px-6 py-4 rounded-xl border hover:bg-gray-50">
            ย้อนกลับไปแก้ไข
          </Link>
          <button onClick={onConfirm} className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-lg font-semibold shadow-lg">
            ยืนยันและส่ง
          </button>
        </div>
      </div>
    </div>
  )
}
