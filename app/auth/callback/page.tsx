'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
    const router = useRouter()
    const params = useSearchParams()

    useEffect(() => {
        const run = async () => {
            const code = params.get('code')
            const next = params.get('redirect_to') ?? '/'
            if (code) {
                await supabaseBrowser().auth.exchangeCodeForSession(code)
            }
            router.replace(next)
        }
        run()
    }, [params, router])

    return <div className="p-6">กำลังเข้าสู่ระบบ…</div>
}