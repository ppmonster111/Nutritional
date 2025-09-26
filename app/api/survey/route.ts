import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
    const data = await req.json(); // { line_user_id, age, gender, ... }

    const { error } = await supabase.from("survey_section2").insert(data);

    if (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
