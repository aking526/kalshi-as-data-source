import { NextResponse } from "next/server";
import { getMarkets } from "@/app/lib/kalshi-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getMarkets(url.searchParams);
  return NextResponse.json(result);
}
