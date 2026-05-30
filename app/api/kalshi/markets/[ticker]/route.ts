import { NextResponse } from "next/server";
import { getMarket } from "@/app/lib/kalshi-client";

export async function GET(_request: Request, context: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await context.params;
  const result = await getMarket(ticker);
  return NextResponse.json(result);
}
