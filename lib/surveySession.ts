import { supabase } from "@/lib/supabaseClient"

/** utils: รวมค่า checkbox + "อื่นๆ" */
const joinWithOther = (arr: string[] | undefined, other?: string) => {
    const base = Array.isArray(arr) ? arr.filter(x => x !== "อื่นๆ") : []
    if (arr?.includes("อื่นๆ") && (other ?? "").trim()) {
        base.push(`อื่นๆ:${(other as string).trim()}`)
    }
    return base.join(", ")
}

/** สร้าง/อัปเดตผู้ใช้ตาม line_user_id แล้วคืน userId */
export async function ensureUser(
    lineUserId: string,
    profile?: Partial<{ display_name: string; picture_url: string; email: string }>
) {
    if (!lineUserId) throw new Error("missing lineUserId")
    const { data, error } = await supabase
        .from("users")
        .upsert(
            {
                line_user_id: lineUserId,
                display_name: profile?.display_name,
                picture_url: profile?.picture_url,
                email: profile?.email,
            },
            { onConflict: "line_user_id" }
        )
        .select("id")
        .single()
    if (error) throw error
    return data.id as string
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
    let id = (lineUserId ?? "").trim();

    // ถ้า caller ไม่ส่งมา ลองอ่านจาก sessionStorage (เฉพาะ client)
    if (!id && typeof window !== "undefined") {
        id = (sessionStorage.getItem("line_user_id") ?? "").trim()
    }

    if (!id) throw new Error("missing lineUserId")

    // sync กลับ sessionStorage เผื่อหน้าอื่นใช้
    if (typeof window !== "undefined") {
        sessionStorage.setItem("line_user_id", id)
    }

    // upsert ผู้ใช้
    const { data: user, error: uerr } = await supabase
        .from("users")//
        .upsert(
            {
                line_user_id: id,
                display_name: profile?.display_name ?? null,
                picture_url: profile?.picture_url ?? null,
                email: profile?.email ?? null,
            },
            { onConflict: "line_user_id" }
        )
        .select("id")
        .single()
    if (uerr) throw uerr

    // reuse session ที่ยังไม่ปิด หรือสร้างใหม่
    const { data: existing, error: serr } = await supabase
        .from("survey_sessions")
        .select("id, finished_at")
        .eq("user_id", user.id)
        .is("finished_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    if (serr) throw serr

    let sessionId: string
    if (existing?.id) {
        sessionId = existing.id
    } else {
        const { data: created, error: cerr } = await supabase
            .from("survey_sessions")
            .insert({ user_id: user.id })
            .select("id")
            .single()
        if (cerr) throw cerr
        sessionId = created.id
    }

    return { userId: user.id, sessionId, lineUserId: id }
}

// ใช้ตอนอยาก "เริ่มรอบใหม่เสมอ" (ไม่ทับของเดิม)
export async function createNewSurveySession(
    lineUserId: string,
    profile?: Partial<{ display_name: string; picture_url: string; email: string }>
) {
    const userId = await ensureUser(lineUserId, profile)
    const { data, error } = await supabase
        .from("survey_sessions")
        .insert({ user_id: userId })
        .select("id")
        .single()
    if (error) throw error
    return data.id as string
}

// Section 2
export async function saveSection2Answers(
    sessionId: string,
    answers: Record<string, string | string[]>
) {
    if (!sessionId) throw new Error("missing sessionId")

    const toText = (v: string | string[] | undefined) =>
        Array.isArray(v) ? v.join(", ") : (v ?? "")

    // แยกค่าที่จำเป็น
    const age = Number(answers.age)
    const gender = (answers.gender as string) || ""
    const year_level = (answers.year_level as string) || ""
    const height_cm = Number(answers.height)
    const weight_kg = Number(answers.weight)
    const current_department = (answers.current_department as string) || ""

    // checkbox + อื่นๆ
    const ulist = (answers.underlying_diseases as string[]) || []
    const underlyingOther = (answers.underlying_diseases_other as string) || ""
    const underlying_diseases =
        ulist.includes("อื่นๆ") && underlyingOther
            ? [...ulist.filter((x) => x !== "อื่นๆ"), `อื่นๆ: ${underlyingOther}`].join(", ")
            : ulist.join(", ")

    const mlist = (answers.regular_medications as string[]) || []
    const medsOther = (answers.regular_medications_other as string) || ""
    const regular_medications =
        mlist.includes("อื่นๆ") && medsOther
            ? [...mlist.filter((x) => x !== "อื่นๆ"), `อื่นๆ: ${medsOther}`].join(", ")
            : mlist.join(", ")

    // ผ่าตัด
    const surgery_history =
        answers.surgery_history === "มี"
            ? ((answers.surgery_history_details as string) || "").trim() || "มี"
            : "ไม่มี"

    // คำนวณ BMI/BSA ฝั่งเซิร์ฟเวอร์
    let bmi: number | null = null
    let bsa: number | null = null
    if (height_cm > 0 && weight_kg > 0) {
        const hM = height_cm / 100
        bmi = Number((weight_kg / (hM * hM)).toFixed(2))
        bsa = Number((0.007184 * Math.pow(weight_kg, 0.425) * Math.pow(height_cm, 0.725)).toFixed(2))
    }

    // เตรียม payload
    const payload: any = {
        session_id: sessionId,
        age,
        gender,
        year_level,
        height_cm,
        weight_kg,
        chronic_disease: underlying_diseases,
        regular_medications,
        surgery_history,
        current_department,
    }



    const { error } = await supabase
        .from("survey_section2")
        .upsert(payload, { onConflict: "session_id" })

    if (error) throw error
}


// Section 3
export async function saveSection3Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")

    // รับเฉพาะค่าที่ใช้จริงในฟอร์ม
    const allowed = new Set(["ทุกวัน/เกือบทุกวัน", "3-4 ต่อสัปดาห์", "แทบไม่ทำ/ไม่ทำเลย"])
    const pick = (k: string) => (allowed.has(a[k] ?? "") ? a[k]! : "")

    // แมปคำตอบ -> คอลัมน์ภาษาอังกฤษ (ที่คุณมีอยู่แล้ว)
    const payload: Record<string, any> = {
        session_id: sessionId,

        // 3.1 หวาน
        drink_plain_water: pick("section1_q1"),
        sugary_drinks_soda_coffee_tea_fermented_milk: pick("section1_q2"),
        packaged_veg_fruit_juice: pick("section1_q3"),
        desserts_icecream_bakery_thai: pick("section1_q4"),
        add_extra_sugar_in_food: pick("section1_q5"),

        // 3.2 ไขมัน
        choose_lean_meat_no_skin: pick("section2_q1"),
        fried_fastfood_oily_stirfry: pick("section2_q2"),
        single_dish_high_fat_or_coconut_curry: pick("section2_q3"),
        drinks_with_condensed_milk_creamer_whipping_cream: pick("section2_q4"),
        consume_soup_broth_or_pour_broth_on_rice: pick("section2_q5"),

        // 3.3 โซเดียม
        taste_before_seasoning_fish_soy_sauce: pick("section3_q1"),
        foods_with_herbs_spices: pick("section3_q2"),
        processed_meats_salty_fish_dried_shrimp_pla_ra: pick("section3_q3"),
        instant_noodles_congee_or_frozen_meals: pick("section3_q4"),
        pickled_veg_or_candied_fruits: pick("section3_q5"),
    }

    // คิดคะแนน: ทุกวัน/เกือบทุกวัน = 3, 3-4 ต่อสัปดาห์ = 2, แทบไม่ทำ/ไม่ทำเลย = 1
    const scoreOf = (v: string) =>
        v === "ทุกวัน/เกือบทุกวัน" ? 3
            : v === "3-4 ต่อสัปดาห์" ? 2
                : v === "แทบไม่ทำ/ไม่ทำเลย" ? 1
                    : 0

    const sugarKeys = ["section1_q1", "section1_q2", "section1_q3", "section1_q4", "section1_q5"]
    const fatKeys = ["section2_q1", "section2_q2", "section2_q3", "section2_q4", "section2_q5"]
    const sodiumKeys = ["section3_q1", "section3_q2", "section3_q3", "section3_q4", "section3_q5"]

    const sum = (keys: string[]) => keys.reduce((s, k) => s + scoreOf(a[k] ?? ""), 0)

    payload.sugar_score = sum(sugarKeys)
    payload.fat_score = sum(fatKeys)
    payload.sodium_score = sum(sodiumKeys)
    payload.total_score = payload.sugar_score + payload.fat_score + payload.sodium_score

    // upsert โดยชนกันที่ session_id (ไม่ทับ session อื่น)
    const { error } = await supabase
        .from("survey_section3")
        .upsert(payload, { onConflict: "session_id" })

    if (error) throw error
}


/** บันทึก Section 4 */
export async function saveSection4Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")

    // 4.1: ใช่/ไม่ใช่/ไม่แน่ใจ → เก็บไทย
    const ynMap: Record<string, string> = {
        "Yes": "ใช่", "No": "ไม่ใช่", "Not sure": "ไม่แน่ใจ",
    }
    const yn = (k: string) => (["ใช่", "ไม่ใช่", "ไม่แน่ใจ"].includes(a[k] ?? "") ? a[k]!
        : (ynMap[a[k] ?? ""] ?? ""))

    // 4.2: น้ำหนักเกิน/ปกติ/น้อยกว่า → เก็บไทย
    const wMap: Record<string, string> = {
        "Overweight": "น้ำหนักเกิน",
        "Normal weight": "น้ำหนักปกติ",
        "Underweight": "น้ำหนักน้อยกว่าปกติ",
    }
    const w = (k: string) => (["น้ำหนักเกิน", "น้ำหนักปกติ", "น้ำหนักน้อยกว่าปกติ"].includes(a[k] ?? "") ? a[k]!
        : (wMap[a[k] ?? ""] ?? ""))

    // 4.3: เหนื่อยง่าย/ปกติ/กระตือรือร้น/ผิดปกติ/ไม่แน่ใจ → เก็บไทย
    const energyMap: Record<string, string> = {
        "Easily fatigued": "เหนื่อยง่าย",
        "Normal": "ปกติ",
        "Energetic": "กระตือรือร้น",
        "Abnormal": "ผิดปกติ",
        "Not sure": "ไม่แน่ใจ",
    }
    const e = (k: string) => (["เหนื่อยง่าย", "ปกติ", "กระตือรือร้น", "ผิดปกติ", "ไม่แน่ใจ"].includes(a[k] ?? "") ? a[k]!
        : (energyMap[a[k] ?? ""] ?? ""))

    const payload = {
        session_id: sessionId,
        // 4.1
        avoid_junk_food: yn("section41_q1"),
        read_nutrition_labels: yn("section41_q2"),
        take_dietary_supplements: yn("section41_q3"),
        track_eating_and_portions: yn("section41_q4"),
        weigh_regularly: yn("section41_q5"),
        graze_all_day: yn("section41_q6"),
        // 4.2
        self_weight_status: w("section42"),
        // 4.3
        daily_functioning: e("section43"),
    }

    await supabase
        .from("survey_section4")
        .upsert(payload, { onConflict: "session_id" })
        .throwOnError()
}

/** บันทึก Section 5 */
export async function saveSection5Answers(
    sessionId: string,
    a: Record<string, string>
) {
    if (!sessionId) throw new Error("missing sessionId")

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
        total <= 4 ? "ความเครียดน้อย"
            : total <= 7 ? "ความเครียดปานกลาง"
                : total <= 9 ? "ความเครียดมาก"
                    : "ความเครียดมากที่สุด"

    const payload = {
        session_id: sessionId,
        q1_sleep: q1,
        q2_concentration: q2,
        q3_irritable: q3,
        q4_bored: q4,
        q5_social_avoidance: q5,
        total_score: total,
        stress_level: stressLevel, // เก็บเป็นภาษาไทย
    }

    await supabase
        .from("survey_section5")
        .upsert(payload, { onConflict: "session_id" }) // 1 session = 1 แถว
        .throwOnError()

    return { total, stressLevel }
}

/** ปิดแบบสอบถาม */
export async function finalizeSurvey(sessionId: string) {
    if (!sessionId) throw new Error("missing sessionId")
    await supabase
        .from("survey_sessions")
        .update({ finished_at: new Date().toISOString() })
        .eq("id", sessionId)
        .throwOnError()
}
