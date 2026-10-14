import { getService } from "../../../server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  try { return await (await getService()).handle(request); }
  catch (error) {
    console.error("Translation service initialization:", error);
    return Response.json({ error: "Translation service is unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const GET = handle;
export const POST = handle;
