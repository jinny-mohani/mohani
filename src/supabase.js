import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",          // 로그인 후 돌아올 때 ?code= 로 받아 안전하게 교환
      persistSession: true,      // 로그인 상태를 기기에 저장 → 다시 열어도 유지
      autoRefreshToken: true,    // 만료되기 전에 자동으로 연장
      detectSessionInUrl: true,
    },
  }
);
