// app/forms/[slug]/page.tsx
import DynamicSurvey from '../DynamicSurvey'
import { supabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic' // ไม่แคช

export default async function FormPage({ params }: { params: { slug: string } }) {
    const supabase = supabaseServer()

    const { data, error } = await supabase.rpc('get_form_schema', {
        slug_in: params.slug,
    })

    if (error) {
        console.error('get_form_schema error:', error)
        return (
            <div className="max-w-3xl mx-auto p-6 my-8 rounded-2xl border bg-white">
                โหลดฟอร์มไม่สำเร็จ 🥲
            </div>
        )
    }

    if (!data || !data.sections?.length) {
        return (
            <div className="max-w-3xl mx-auto p-6 my-8 rounded-2xl border bg-white">
                ไม่พบฟอร์ม/ไม่มี Section
            </div>
        )
    }

    return <DynamicSurvey schema={data} locale="th" />
}
