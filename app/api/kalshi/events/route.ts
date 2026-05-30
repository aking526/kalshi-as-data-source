import { NextResponse } from "next/server";
import { getEvents } from "@/app/lib/kalshi-client";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await getEvents(url.searchParams);
  return NextResponse.json(result);
}
