import { getComponents } from "@/lib/getComponents";

export async function GET() {
  const components = await getComponents();
  return Response.json(components);
}
