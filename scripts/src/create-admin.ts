import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";

async function main() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Usage: pnpm --filter @workspace/scripts run create-admin <username> <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, role: "admin", resellerId: null })
    .returning();

  console.log(`Admin created: id=${user.id} username=${user.username}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
