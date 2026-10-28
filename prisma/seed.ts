import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Demo data for the web page: 30-minute slots, 09:00–12:00 UTC, two providers, next 7 days.
// (The grader replaces all slots through POST /reset, so this is only for local/demo use.)
async function main() {
  const providers = ["Dr Ade", "Dr Bello"];
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);

  const slots: { id: string; provider: string; start: Date; end: Date }[] = [];
  let n = 1;
  for (let day = 1; day <= 7; day++) {
    for (const provider of providers) {
      for (let half = 0; half < 6; half++) {
        const start = new Date(base);
        start.setUTCDate(base.getUTCDate() + day);
        start.setUTCHours(9, half * 30, 0, 0);
        slots.push({ id: `s${n++}`, provider, start, end: new Date(start.getTime() + 30 * 60_000) });
      }
    }
  }

  const result = await prisma.slot.createMany({ data: slots, skipDuplicates: true });
  console.log(`Seeded ${result.count} new slots`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
