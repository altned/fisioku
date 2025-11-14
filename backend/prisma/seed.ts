import {
  Gender,
  Prisma,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const seedUsers = [
  {
    email: "admin@fisioku.local",
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    fullName: "Admin Fisioku",
  },
  {
    email: "patient@fisioku.local",
    role: UserRole.PATIENT,
    status: UserStatus.ACTIVE,
    fullName: "Patient Demo",
    profileType: "patient" as const,
    profile: {
      fullName: "Patient Demo",
      gender: Gender.FEMALE,
    },
  },
  {
    email: "therapist@fisioku.local",
    role: UserRole.THERAPIST,
    status: UserStatus.ACTIVE,
    fullName: "Therapist Demo",
    profileType: "therapist" as const,
    profile: {
      fullName: "Therapist Demo",
      gender: Gender.MALE,
      city: "Jakarta",
      specialties: ["Orthopedic", "Sports"],
      experienceYears: 5,
      licenseNumber: "LIC-0001",
    },
  },
];

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  await prisma.therapyPackage.createMany({
    data: [
      {
        name: "Single Session",
        description: "Sesi tunggal fisioterapi home-visit untuk kebutuhan akut.",
        sessionCount: 1,
        price: new Prisma.Decimal(350_000),
        defaultExpiryDays: 7,
      },
      {
        name: "Recovery Pack",
        description: "Paket 4 sesi untuk pemulihan pasca cedera.",
        sessionCount: 4,
        price: new Prisma.Decimal(1_200_000),
        defaultExpiryDays: 30,
      },
    ],
    skipDuplicates: true,
  });

  for (const user of seedUsers) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        password,
        role: user.role,
        status: user.status,
      },
    });

    if (user.profileType === "patient") {
      await prisma.patientProfile.upsert({
        where: { userId: createdUser.id },
        update: {},
        create: {
          userId: createdUser.id,
          fullName: user.profile.fullName,
          gender: user.profile.gender,
        },
      });
    }

    if (user.profileType === "therapist") {
      await prisma.therapistProfile.upsert({
        where: { userId: createdUser.id },
        update: {},
        create: {
          userId: createdUser.id,
          fullName: user.profile.fullName,
          gender: user.profile.gender,
          city: user.profile.city,
          specialties: user.profile.specialties,
          experienceYears: user.profile.experienceYears,
          licenseNumber: user.profile.licenseNumber,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
