import { NextResponse } from "next/server";
import { getContainer } from "@/server/container";
import { handle, json } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = handle(async (_req: Request, context: RouteContext) => {
  const { id } = await context.params;
  const repo = await getContainer().reposService.getRepo(id);
  return json(repo, 200);
});

export const DELETE = handle(async (_req: Request, context: RouteContext) => {
  const { id } = await context.params;
  await getContainer().reposService.deleteRepo(id);
  return new NextResponse(null, { status: 204 });
});
