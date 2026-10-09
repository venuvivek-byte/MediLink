import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    const response = NextResponse.json({ success: true });
    // Clear demo session cookie
    response.cookies.set("patient_session", "", {
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error: any) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("patient_session", "", {
      maxAge: 0,
      path: "/",
    });
    return response;
  }
}
