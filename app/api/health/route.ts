import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  let dbOk = true;
  try {
    await pool.query("SELECT 1");
  } catch {
    dbOk = false;
  }
  return NextResponse.json({ status: "ok", database: dbOk });
}
