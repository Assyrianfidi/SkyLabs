# SkyLabs - Modern Web Development Studio

SkyLabs is a full-stack web application built with React, TypeScript, Express, and PostgreSQL. This project serves as the main website for SkyLabs, a web development studio that builds modern websites, applications, and digital solutions.

## 🚀 Features

- **Modern UI/UX** with responsive design
- **Contact Form** with form validation
- **Portfolio Showcase** of past projects
- **Services** overview
- **About Us** section
- **Blog** (Coming Soon)

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with custom theming
- **Build Tool**: Vite
- **Deployment**: Configured for Vercel/Netlify

## 📦 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## 🚀 Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/your-username/skylabs.git
cd skylabs
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following content:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration
CONTACT_EMAIL=fidi.amazon@gmail.com
ENABLE_MAILING=false  # Set to true to enable email notifications

# Database Configuration (Update with your PostgreSQL credentials)
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/skylabs

# Session Secret (generate a secure random string for production)
SESSION_SECRET=your-secure-session-secret

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Contact Form Configuration
CONTACT_EMAIL=contact@skylabs.dev
```

## 🗄 Database Setup

### Prerequisites

- PostgreSQL 14+ installed and running
- Database user with appropriate permissions

### Initial Setup

1. **Create the database** (if it doesn't exist):

   ```bash
   npx tsx scripts/db-init.ts
   ```

   This script will:
   - Validate the database configuration
   - Create the database if it doesn't exist
   - Apply all pending migrations
   - Verify the database connection

### Database Migrations

#### Creating Migrations

When you make changes to your database schema in `shared/schema.ts`:

1. Generate a new migration:

   ```bash
   npx drizzle-kit generate:pg --schema=./shared/schema.ts
   ```

2. Review the generated migration files in the `migrations` folder

#### Applying Migrations

Migrations are automatically applied when running the application in development mode. For production:

```bash
npx drizzle-kit migrate:pg --schema=./shared/schema.ts
```

### Common Database Tasks

- **Reset the database** (development only):

  ```bash
  npx tsx scripts/db-reset.ts
  ```

- **Run database tests**:

  ```bash
  npm run test:db
  ```

## 🔄 Development Workflow

1. **Start the development server**:

   ```bash
   npm run dev
   ```

   This will:
   - Start the Vite dev server for the frontend
   - Start the Express server for the backend
   - Enable hot module replacement (HMR)

2. **Database changes**:
   - Update the schema in `shared/schema.ts`
   - Generate and apply migrations
   - Test your changes

## 🐛 Troubleshooting

### Common Issues

1. **Database connection failed**:
   - Verify PostgreSQL is running
   - Check your `.env` file for correct credentials
   - Ensure the database user has the right permissions

2. **Migration errors**:
   - Check the error logs in `ERROR_LOG.md`
   - Verify the migration files in the `migrations` folder

3. **Environment variables not loading**:
   - Ensure the `.env` file is in the root directory
   - Restart your development server after making changes

### Viewing Logs

- Application logs are output to the console
- Database errors are logged to `ERROR_LOG.md`
- Check `TODO.md` for pending tasks and known issues

4. **Set up the database**
   - Make sure PostgreSQL is installed and running
   - Create a new database (or use an existing one)
   - Update the `DATABASE_URL` in your `.env` file
   - Initialize the database:
     ```bash
     # This will create the database if it doesn't exist
     # and set up all the necessary tables
     npm run db:setup
     ```
   - If you need to reset the database:
     ```bash
     npm run db:reset
     ```

5. **Start the development server**
   ```bash
   # Start both frontend and backend in development mode
   npm run dev
   ```
   - Frontend will be available at: http://localhost:3000
   - API will be available at: http://localhost:3000/api

## 🏗 Project Structure

```
skylabs/
├── client/              # Frontend React application
│   ├── public/          # Static files
│   └── src/             # Source files
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page components
│       ├── styles/      # Global styles
│       └── App.tsx      # Main App component
├── server/             # Backend Express application
│   ├── routes/         # API routes
│   ├── models/         # Database models
│   └── index.ts        # Server entry point
├── shared/             # Shared code between frontend and backend
│   └── schema.ts       # Shared TypeScript types and validations
├── .env                # Environment variables
├── package.json        # Project dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run check` - Type checking
- `npm run db:push` - Run database migrations

## 🌐 Deployment

### Vercel / Netlify

1. Push your code to a GitHub/GitLab repository
2. Import the repository to Vercel or Netlify
3. Configure environment variables in the deployment settings
4. Deploy!

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For any questions or inquiries, please contact us at [contact@skylabs.dev](mailto:contact@skylabs.dev)
