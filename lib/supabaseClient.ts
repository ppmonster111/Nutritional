import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// ถ้ามี type Database ก็ใส่ <Database> ได้
export const supabaseBrowser = () => createClientComponentClient()
export const supabaseServer  = () => createServerComponentClient({ cookies })

