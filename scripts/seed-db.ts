import { db } from '../server/db';
import { users, contacts } from '../shared/schema';
import { hash } from 'bcrypt';
import { faker } from '@faker-js/faker';
import 'dotenv/config';

async function seedDatabase() {
  console.log('Seeding database with initial data...');

  try {
    // Create admin user
    const hashedPassword = await hash('admin123', 10);
    const [admin] = await db.insert(users).values({
      username: 'admin',
      password: hashedPassword,
    }).returning();

    console.log('Created admin user:', admin.username);

    // Generate fake contacts
    const fakeContacts = Array.from({ length: 10 }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      message: faker.lorem.paragraph(),
    }));

    const createdContacts = await db
      .insert(contacts)
      .values(fakeContacts)
      .returning();

    console.log(`Created ${createdContacts.length} sample contacts`);
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
