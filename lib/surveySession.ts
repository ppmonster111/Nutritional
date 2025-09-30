"use client"

import { supabaseBrowser } from '@/lib/supabase/browser'

/** utils: รวมค่า checkbox + "อื่นๆ" ให้เป็นสตริงเดียว */
const joinWithOther = (arr: string[] | undefined, other?: string) => {
    const base = Array.isArray(arr) ? arr.filter((x) => x !== "อื่นๆ") : []
    if (arr?.includes("อื่นๆ") && (other ?? "").trim()) {
        base.push(`อื่นๆ: ${(other as string).trim()}`)
    }
    return base.join(", ")
}

/** อัปเดตโปรไฟล์ที่ผูกกับ auth.user.id (เก็บ line_user_id, display_name, picture_url, email) */
export async function upsertProfile(partial: {
    display_name?: string | null
    picture_url?: string | null
    email?: string | null
    line_user_id?: string | null
}) {
    const supabase = supabaseBrowser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("not authenticated")

    await supabase
        .from("profiles")
        .upsert({ id: user.id, ...partial }, { onConflict: "id" })
        .throwOnError()
}


export type UserProfile = {
    display_name?: string | null
    picture_url?: string | null
    email?: string | null
}

export async function ensureUserAndSession(
    lineUserId?: string | null,
    profile?: UserProfile
): Promise<{ userId: string; sessionId: string; lineUserId: string }> {
    const supabase = supabaseBrowser()

    // ให้แน่ใจว่ามี Supabase auth session (anonymous ก็ได้ถ้าเปิดไว้)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) throw error
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('not authenticated')

    const lid = (lineUserId ?? sessionStorage.getItem('line_user_id') ?? '').trim()
    if (lid) sessionStorage.setItem('line_user_id', lid)

    // upsert โปรไฟล์ลงตาราง profiles (ไม่มี users แล้ว)
    await supabase.from('profiles').upsert({
        id: user.id,                 // FK -> auth.users.id
        line_user_id: lid || null,
        display_name: profile?.display_name ?? null,
        picture_url: profile?.picture_url ?? null,
        email: profile?.email ?? null,
    }, { onConflict: 'id' }).throwOnError()

    // หา session แบบสอบถามที่ยังไม่ปิด หรือสร้างใหม่
    const { data: existing } = await supabase
        .from('survey_sessions')
        .select('id')
        .eq('user_id', user.id)
        .is('finished_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    let sessionId: string
    if (existing?.id) {
        sessionId = existing.id
    } else {
        const { data: created } = await supabase
            .from('survey_sessions')
            .insert({ user_id: user.id })
            .select('id')
            .single()
            .throwOnError()
        sessionId = created!.id
    }

    return { userId: user.id, sessionId, lineUserId: lid }
}

/** หรือถ้าอยากแค่ “ได้ session ที่ยังไม่ปิด” */
export async function ensureSurveySession() {
    const supabase = supabaseBrowser()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("not authenticated")

    const { data: existing } = await supabase
        .from("survey_sessions")
        .select("id, finished_at")
        .eq("user_id", user.id)
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()

    if (existing?.id) return existing.id

    const { data: created, error } = await supabase
        .from("survey_sessions")
        .insert({ user_id: user.id })
        .select("id")
        .single()
    if (error) throw error

    return created.id
}

/** Section 2: บันทึกคำตอบ + คำนวณ BMI/BSA แล้วอัปเดต */
export async function saveSection2Answers(
    sessionId: string,
    answers: Record<string, string | string[]>
) {
    if (!sessionId) throw new Error("missing sessionId")
    const supabase = supabaseBrowser()

    const height_cm = Number(answers.height)
    const weight_kg = Number(answers.weight)

    // คำนวณ BMI/BSA
    let bmi: number | null = null
    let bsa: number | null = null
    if (height_cm > 0 && weight_kg > 0) {
        const hM = height_cm / 100
        bmi = Number((weight_kg / (hM * hM)).toFixed(2))
        bsa = Number((0.007184 * Math.pow(weight_kg, 0.425) * Math.pow(height_cm, 0.725)).toFixed(2))
    }

    const payload = {
        session_id: sessionId,
        age: Number(answers.age),
        gender: answers.gender as string,
        year_level: answers.year_level as string,
        height_cm,
        weight_kg,
        chronic_disease: joinWithOther(
            answers.underlying_diseases as string[] | undefined,
            answers.underlying_diseases_other as string
        ),
        regular_medications: joinWithOther(
            answers.regular_medications as string[] | undefined,
            answers.regular_medications_other as string
        ),
        surgery_history:
            answers.surgery_history === "มี"
                ? ((answers.surgery_history_details as string) || "มี")
                : "ไม่มี",
        current_department: answers.current_department as string,
    }

    await supabase
        .from("survey_section2")
        .upsert(payload, { onConflict: "session_id" })
        .throwOnError()
}

/** Section 3 */
export async function saveSection3Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")
    const supabase = supabaseBrowser()

    const allowed = new Set(["ทุกวัน/เกือบทุกวัน", "3-4 ต่อสัปดาห์", "แทบไม่ทำ/ไม่ทำเลย"])
    const pick = (k: string) => (allowed.has(a[k] ?? "") ? a[k]! : "")

    const payload: Record<string, any> = {
        session_id: sessionId,
        // 3.1
        drink_plain_water: pick("section1_q1"),
        sugary_drinks_soda_coffee_tea_fermented_milk: pick("section1_q2"),
        packaged_veg_fruit_juice: pick("section1_q3"),
        desserts_icecream_bakery_thai: pick("section1_q4"),
        add_extra_sugar_in_food: pick("section1_q5"),
        // 3.2
        choose_lean_meat_no_skin: pick("section2_q1"),
        fried_fastfood_oily_stirfry: pick("section2_q2"),
        single_dish_high_fat_or_coconut_curry: pick("section2_q3"),
        drinks_with_condensed_milk_creamer_whipping_cream: pick("section2_q4"),
        consume_soup_broth_or_pour_broth_on_rice: pick("section2_q5"),
        // 3.3
        taste_before_seasoning_fish_soy_sauce: pick("section3_q1"),
        foods_with_herbs_spices: pick("section3_q2"),
        processed_meats_salty_fish_dried_shrimp_pla_ra: pick("section3_q3"),
        instant_noodles_congee_or_frozen_meals: pick("section3_q4"),
        pickled_veg_or_candied_fruits: pick("section3_q5"),
    }


    const scoreOf = (v: string) =>
        v === "ทุกวัน/เกือบทุกวัน" ? 3 :
            v === "3-4 ต่อสัปดาห์" ? 2 :
                v === "แทบไม่ทำ/ไม่ทำเลย" ? 1 : 0

    const sum = (keys: string[]) => keys.reduce((s, k) => s + scoreOf(a[k] ?? ""), 0)

    const sugarKeys = ["section1_q1", "section1_q2", "section1_q3", "section1_q4", "section1_q5"]
    const fatKeys = ["section2_q1", "section2_q2", "section2_q3", "section2_q4", "section2_q5"]
    const sodKeys = ["section3_q1", "section3_q2", "section3_q3", "section3_q4", "section3_q5"]

    payload.sugar_score = sum(sugarKeys)
    payload.fat_score = sum(fatKeys)
    payload.sodium_score = sum(sodKeys)
    payload.total_score = payload.sugar_score + payload.fat_score + payload.sodium_score

    await supabase
        .from("survey_section3")
        .upsert(payload, { onConflict: "session_id" })
        .throwOnError()
}

/** Section 4 */
export async function saveSection4Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")
    const supabase = supabaseBrowser()

    const ynMap: Record<string, string> = { "Yes": "ใช่", "No": "ไม่ใช่", "Not sure": "ไม่แน่ใจ" }
    const wMap: Record<string, string> = { "Overweight": "น้ำหนักเกิน", "Normal weight": "น้ำหนักปกติ", "Underweight": "น้ำหนักน้อยกว่าปกติ" }
    const eMap: Record<string, string> = { "Easily fatigued": "เหนื่อยง่าย", "Normal": "ปกติ", "Energetic": "กระตือรือร้น", "Abnormal": "ผิดปกติ", "Not sure": "ไม่แน่ใจ" }

    const yn = (k: string) => (["ใช่", "ไม่ใช่", "ไม่แน่ใจ"].includes(a[k] ?? "") ? a[k]! : (ynMap[a[k] ?? ""] ?? ""))
    const w = (k: string) => (["น้ำหนักเกิน", "น้ำหนักปกติ", "น้ำหนักน้อยกว่าปกติ"].includes(a[k] ?? "") ? a[k]! : (wMap[a[k] ?? ""] ?? ""))
    const e = (k: string) => (["เหนื่อยง่าย", "ปกติ", "กระตือรือร้น", "ผิดปกติ", "ไม่แน่ใจ"].includes(a[k] ?? "") ? a[k]! : (eMap[a[k] ?? ""] ?? ""))


    const payload = {
        session_id: sessionId,
        avoid_junk_food: yn("section41_q1"),
        read_nutrition_labels: yn("section41_q2"),
        take_dietary_supplements: yn("section41_q3"),
        track_eating_and_portions: yn("section41_q4"),
        weigh_regularly: yn("section41_q5"),
        graze_all_day: yn("section41_q6"),
        self_weight_status: w("section42"),
        daily_functioning: e("section43"),
    }

    await supabase
        .from("survey_section4")
        .upsert(payload, { onConflict: "session_id" })
        .throwOnError()
}

/** Section 5 */
export async function saveSection5Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")
    const supabase = supabaseBrowser()

    const num = (k: string) => {
        const v = Number(a[k] ?? "")
        return Number.isFinite(v) ? v : null
    }

    const q1 = num("stress_q1")
    const q2 = num("stress_q2")
    const q3 = num("stress_q3")
    const q4 = num("stress_q4")
    const q5 = num("stress_q5")

    const total =
        (q1 ?? 0) + (q2 ?? 0) + (q3 ?? 0) + (q4 ?? 0) + (q5 ?? 0)

    const stressLevel =
        total <= 4 ? "ความเครียดน้อย" :
            total <= 7 ? "ความเครียดปานกลาง" :
                total <= 9 ? "ความเครียดมาก" :
                    "ความเครียดมากที่สุด"

    const payload = {
        session_id: sessionId,
        q1_sleep: q1,
        q2_concentration: q2,
        q3_irritable: q3,
        q4_bored: q4,
        q5_social_avoidance: q5,
        total_score: total,
        stress_level: stressLevel,
    }

    await supabase
        .from("survey_section5")
        .upsert(payload, { onConflict: "session_id" })
        .throwOnError()

    return { total, stressLevel }
}

/** ปิดแบบสอบถาม */
export async function finalizeSurvey(sessionId: string) {
    if (!sessionId) throw new Error("missing sessionId")
    const supabase = supabaseBrowser()
    await supabase
        .from("survey_sessions")
        .update({ finished_at: new Date().toISOString() })
        .eq("id", sessionId)
        .throwOnError()
}
