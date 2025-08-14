// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        mistralExtractions: true,
        documents: {
          include: {
            pages: {
              take: 1 // Just first page for structure
            }
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: 2
    });
    
    console.warn('Recent Jobs with Extraction Data:');
    console.warn(JSON.stringify(jobs, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());