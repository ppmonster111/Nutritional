import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase/server'

export default async function CallbackPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = supabaseServer()

    const raw = searchParams.code
    const code = Array.isArray(raw) ? raw[0] : raw

    if (typeof code === 'string') {
        const { error } = await supabase.auth.exchangeCodeForSession(code) // <- ส่งเป็น string
        if (error) redirect('/?auth=failed')
    }

    redirect('/')
}
