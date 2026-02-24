import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
    const email = 'lyncoln.sas@gmail.com';
    const newPassword = '123'; // Simple default password for development

    console.log(`🔄 Attempting to reset password for user: ${email}`);

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    try {
        // Update user
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        console.log(`\n✅ SUCCESS: Password reset successfully!`);
        console.log(`📧 User: ${user.email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log(`-------------------------------------------`);
        console.log(`⚠️  Please login immediately and change this password.`);

    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        if (err.code === 'P2025') {
            console.error(`❌ Error: User with email '${email}' not found.`);
        } else {
            console.error('❌ An unexpected error occurred:', err);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
