import { NextResponse } from "next/server";
import { THEMES } from "@/app/lib/classification";

export async function GET() {
  return NextResponse.json({
    data: {
      categories: ["Economics", "Financials", "Companies", "Politics", "Crypto", "Climate", "Energy"],
      themes: THEMES
    },
    source: "sample",
    observed_at: new Date().toISOString(),
    api_health: {
      ok: true,
      message: "Local taxonomy is available. Kalshi tag discovery can be wired here when needed."
    }
  });
}
