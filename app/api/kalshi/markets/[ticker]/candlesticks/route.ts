import { NextResponse } from "next/server";
import { getCandlesticks } from "@/app/lib/kalshi-client";

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const url = new URL(request.url);
  const result = await getCandlesticks(ticker, url.searchParams);
  return NextResponse.json(result);
}
