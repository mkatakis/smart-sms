import bcrypt from "bcrypt";
import { db, usersTable, resellersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  const [, , resellerIdArg, username, password] = process.argv;
  if (!resellerIdArg || !username || !password) {
    console.error("Usage: pnpm --filter @workspace/scripts run create-reseller-user <resellerId> <username> <password>");
    process.exit(1);
  }

  const resellerId = parseInt(resellerIdArg, 10);
  if (isNaN(resellerId)) {
    console.error("resellerId must be a number");
    process.exit(1);
  }

  const [reseller] = await db.select().from(resellersTable).where(eq(resellersTable.id, resellerId));
  if (!reseller) {
    console.error(`Reseller id=${resellerId} not found`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, role: "reseller", resellerId })
    .returning();

  console.log(`Reseller user created: id=${user.id} username=${user.username} resellerId=${resellerId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
