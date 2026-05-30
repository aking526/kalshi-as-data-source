import { NextResponse } from "next/server";
import { getOrderbook } from "@/app/lib/kalshi-client";

export async function GET(request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const url = new URL(request.url);
  const result = await getOrderbook(ticker, url.searchParams);
  return NextResponse.json(result);
}
