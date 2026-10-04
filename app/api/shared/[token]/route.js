import { apiHandler, json } from "@/lib/api";
import { getSharedTrip, hashToken } from "@/lib/tripAccess";
import { rateLimit } from "@/lib/rateLimit";

export const GET = apiHandler("shared.get", async (_request, { params }) => {
  const { token } = await params;
  await rateLimit(`shared:${hashToken(token)}`, 60);
  return json({ trip: await getSharedTrip(token) });
});
