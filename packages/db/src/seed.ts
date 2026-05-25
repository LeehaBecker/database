import { prisma } from "./client.js";

async function main() {
  await prisma.organism.upsert({
    where: { slug: "trypanosoma-brucei" },
    update: {},
    create: { name: "Trypanosoma brucei", slug: "trypanosoma-brucei" },
  });

  await prisma.organism.upsert({
    where: { slug: "leishmania-major" },
    update: {},
    create: { name: "Leishmania major", slug: "leishmania-major" },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
