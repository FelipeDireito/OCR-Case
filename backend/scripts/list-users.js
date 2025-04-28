const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
