import { NextResponse } from "next/server";
import { getSeries } from "@/app/lib/kalshi-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getSeries(url.searchParams);
  return NextResponse.json(result);
}
