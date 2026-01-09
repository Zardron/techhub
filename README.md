# TechEventX - Tech Event Management Platform

A modern, full-stack platform for discovering, managing, and attending tech events worldwide. TechEventX connects developers, innovators, and tech enthusiasts with hackathons, conferences, workshops, and more.

## 🚀 Features

### For Users
- **Event Discovery**: Browse and search through hundreds of tech events
- **Event Booking**: One-click booking system for event registration
- **Event Filtering**: Filter events by location, date, format (Virtual/Onsite/Hybrid), and tags
- **User Dashboard**: View your bookings and manage your profile
- **Newsletter**: Subscribe to stay updated with the latest events
- **Appeals System**: Appeal account bans with detailed reasoning

### For Organizers
- **Event Management**: Create and manage your events
- **Organizer Dashboard**: Track your events and attendees
- **User Management**: Manage users associated with your organization

### For Administrators
- **Comprehensive Dashboard**: Analytics and statistics with interactive charts
- **User Management**: Manage all users, including ban/unban functionality
- **Event Management**: Create, edit, and delete events
- **Organizer Management**: Manage event organizers and their associations
- **Appeals Review**: Review and respond to user ban appeals
- **Statistics**: View growth trends, role distributions, and event mode analytics

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Recharts** - Data visualization
- **Sonner & React Hot Toast** - Toast notifications
- **next-themes** - Dark mode support

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Cloudinary** - Image hosting and management

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking

## 📁 Project Structure

```
devhub/
├── app/                      # Next.js App Router
│   ├── admin-dashboard/     # Admin dashboard pages
│   ├── api/                  # API routes
│   │   ├── admin/           # Admin API endpoints
│   │   ├── appeals/         # Appeals API
│   │   ├── auth/            # Authentication API
│   │   ├── bookings/        # Booking API
│   │   ├── events/          # Events API
│   │   └── newsletter/      # Newsletter API
│   ├── events/              # Event pages
│   ├── bookings/            # User bookings page
│   ├── sign-in/             # Sign in page
│   ├── sign-up/             # Sign up page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── admin-dashboard/    # Admin-specific components
│   ├── ui/                 # Reusable UI components
│   └── providers/          # Context providers
├── database/               # MongoDB models
│   ├── user.model.ts       # User schema
│   ├── event.model.ts      # Event schema
│   ├── booking.model.ts    # Booking schema
│   ├── organizer.model.ts  # Organizer schema
│   ├── appeal.model.ts     # Appeal schema
│   └── newsletter.model.ts # Newsletter schema
├── lib/                    # Utility functions and configurations
│   ├── hooks/             # Custom React hooks
│   │   └── api/           # API query hooks
│   ├── store/             # Zustand stores
│   ├── auth.ts            # Authentication utilities
│   ├── mongodb.ts         # MongoDB connection
│   └── cloudinary.ts      # Cloudinary configuration
└── public/                # Static assets
```

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun
- MongoDB database (local or cloud)
- Cloudinary account (for image hosting)
- Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd devhub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=your_mongodb_connection_string
   # OR use individual variables:
   MONGO_DB_SRV=your_mongodb_srv
   MONGO_DB_USER=your_mongodb_user
   MONGO_DB_PASSWORD=your_mongodb_password
   MONGO_DB_NAME=your_database_name

   # JWT Secret
   JWT_SECRET=your_jwt_secret_key

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔐 Authentication & Authorization

The platform supports three user roles:

- **Admin**: Full access to all features including user management, event management, and analytics
- **Organizer**: Can create and manage events, view associated users
- **User**: Can browse events, make bookings, and manage their profile

Authentication is handled via JWT tokens stored in HTTP-only cookies.

## 🗄️ Database Models

### User
- Email, password, name
- Role (admin, user, organizer)
- Organizer association (for organizer role)
- Ban status and soft delete

### Event
- Title, description, overview
- Venue, location, date, time
- Mode (Virtual, Onsite, Hybrid)
- Organizer, tags, agenda
- Auto-generated slug

### Booking
- User and event references
- Booking status and timestamps

### Organizer
- Name, description, logo
- Contact information

### Appeal
- User reference and reason
- Status (pending, approved, rejected)

### Newsletter
- Email subscription management

## 🎨 UI/UX Features

- **Dark Mode**: System-aware theme switching
- **Responsive Design**: Mobile-first approach
- **Animations**: Smooth scroll animations and transitions
- **Glass Morphism**: Modern glassmorphic UI elements
- **Interactive Charts**: Real-time analytics visualization
- **Toast Notifications**: User feedback system

## 🔒 Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- MongoDB injection prevention via Mongoose
- Secure cookie handling

## 📊 Admin Dashboard Features

- **Statistics Overview**: Total users, events, bookings, organizers
- **Growth Analytics**: Time-series charts showing platform growth
- **Role Distribution**: Pie charts for user role breakdown
- **Event Mode Distribution**: Analysis of Virtual/Onsite/Hybrid events
- **Trend Indicators**: Month-over-month growth percentages
- **Quick Actions**: Direct links to management pages

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add your environment variables
4. Deploy

### Environment Variables for Production

Ensure all environment variables are set in your deployment platform:
- `MONGODB_URI` or MongoDB connection variables
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [MongoDB Documentation](https://www.mongodb.com/docs)
- [Mongoose Documentation](https://mongoosejs.com/docs)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

---

Built with ❤️ using Next.js and modern web technologies.
