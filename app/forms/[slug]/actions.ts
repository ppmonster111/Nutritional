'use server'

import { supabaseServer } from '@/lib/supabase/server'

type Answer = { field_id: string; value: any }

export async function submitForm(
    formId: string,
    version: number,
    answers: Answer[]
) {
    const supabase = supabaseServer()

    // ส่งเป็น JSON ธรรมดาไปที่ RPC
    const { error } = await supabase.rpc('save_form_answers', {
        form_id_in: formId,
        version_in: version,
        answers_in: answers,
    })

    if (error) {
        console.error('save_form_answers error:', error)
        throw error
    }
    return { ok: true }
}
