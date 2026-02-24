"use server";

import { deleteSession } from "@/lib/auth/session";

export async function HelperLogout() {
    await deleteSession();
}
