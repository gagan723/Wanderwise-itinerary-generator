import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/user";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();

  if (!email) return null;

  await connectToDatabase();
  return User.findOne({ email }).select("_id").lean();
}
