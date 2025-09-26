import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    const { line_user_id, display_name, picture_url, email } = await req.json();

    const { error } = await supabase.from("users").upsert({
        line_user_id,
        display_name,
        picture_url,
        email,
    });

    if (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
