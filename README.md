# NaviGO 🚌

A comprehensive real-time bus tracking system with mobile app, admin dashboard, and backend infrastructure. Built with React Native, Expo, React, and Supabase.

## 🌟 Project Overview

NaviGO is a complete bus tracking solution consisting of:
- **Mobile App** - React Native app for passengers
- **Admin Dashboard** - React web app for fleet management
- **Backend** - Supabase database with real-time capabilities
- **Database** - PostgreSQL with comprehensive schema

## ✨ Features

### 📱 Mobile App (Passenger)
- **Live Map Tracking** - Real-time bus location tracking on interactive maps
- **Bus List** - View all available buses with status indicators and PWD seat availability
- **Route Planning** - Search routes by origin and destination with detailed information
- **User Location** - GPS tracking with location permissions
- **Modern UI/UX** - Beautiful gradient design with accessibility features

### 🖥️ Admin Dashboard
- **Fleet Management** - Bus management, bus conductor assignments, maintenance scheduling
- **Route Management** - Route creation, stop management, fare management
- **Driver Management** - Driver profiles, assignments, performance tracking
- **Analytics** - Real-time system overview, performance metrics, financial reports
- **User Management** - Passenger accounts, feedback review, support tickets

### 🗄️ Backend & Database
- **Real-time Updates** - WebSocket connections for live tracking
- **Security** - Row Level Security (RLS) policies
- **Authentication** - Supabase Auth for users and admins
- **API** - RESTful API with real-time subscriptions
- **Data Management** - Comprehensive database schema with 41 essential SQL files

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account
- Google Maps API key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd MetroBus-Tracker-main
```

### 2. Mobile App Setup
```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on device/simulator
npm run android  # Android
npm run ios      # iOS
```

### 3. Admin Dashboard Setup
```bash
cd admin-website
npm install
npm start
```

### 4. Database Setup
1. Create a Supabase project
2. Run the SQL files in order:
   ```bash
   # Core setup
   supabase-schema.sql
   complete-rls-fix.sql
   complete-realtime-setup.sql
   
   # Phase-specific setup
   phase3-complete-setup.sql
   clean-function-fix.sql
   ```

## 🛠️ Technology Stack

### Mobile App
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **Maps**: React Native Maps (Google Maps)
- **Location**: Expo Location
- **State Management**: React Context
- **Backend**: Supabase

### Admin Dashboard
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **Maps**: React Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Supabase

### Backend & Database
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **API**: Supabase REST API
- **Security**: Row Level Security (RLS)

## 📁 Project Structure

```
MetroBus-Tracker-main/
├── 📱 Mobile App
│   ├── App.js                 # Main app component
│   ├── screens/               # Screen components
│   │   ├── HomeScreen.js      # Main dashboard
│   │   ├── MapScreen.js       # Live map tracking
│   │   ├── BusListScreen.js   # Bus list and filtering
│   │   ├── RouteScreen.js     # Route planning
│   │   └── DriverScreens/     # Driver-specific screens
│   ├── components/            # Reusable components
│   ├── contexts/              # React contexts
│   ├── lib/                   # Utilities and configurations
│   └── assets/                # App assets
│
├── 🖥️ Admin Dashboard
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   └── utils/            # Utility functions
│   └── public/               # Static assets
│
├── 🗄️ Database
│   ├── sql/                  # 41 essential SQL files
│   │   ├── supabase-schema.sql      # Main database schema
│   │   ├── complete-rls-fix.sql     # Security policies
│   │   ├── complete-realtime-setup.sql # Real-time setup
│   │   └── phase3-complete-setup.sql # Backend processing
│   └── scripts/              # Database utility scripts
│
└── 📚 Documentation
    ├── DATABASE_SCHEMA.md    # Database documentation
    ├── SUPABASE_SETUP.md     # Supabase setup guide
    ├── GOOGLE_MAPS_SETUP.md  # Maps setup guide
    └── ANDROID_SETUP.md      # Android setup guide
```

## 🔧 Configuration

### Environment Variables

#### Mobile App
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

#### Admin Dashboard
Create a `.env` file in `admin-website/`:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Google Maps Setup
1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
3. Update the API key in `app.json` and environment variables

### Supabase Setup
1. Create a new Supabase project
2. Run the database schema files in order
3. Configure Row Level Security policies
4. Set up authentication providers
5. Enable real-time subscriptions

## 📊 Database Schema

### Core Tables
- **`routes`** - Bus routes with origin, destination, fare, and duration
- **`drivers`** - Bus conductor information and contact details
- **`buses`** - Bus fleet with capacity, status, and assignments
- **`stops`** - Bus stops with coordinates and route sequences
- **`schedules`** - Timetables for buses on specific routes
- **`users`** - Passenger information and preferences
- **`location_updates`** - Real-time location data for buses
- **`driver_sessions`** - Bus conductor authentication sessions
- **`feedback`** - User feedback and ratings

### Key Features
- **Real-time Updates** - Live bus tracking with WebSocket connections
- **Security** - Row Level Security (RLS) for data protection
- **Authentication** - User and bus conductor authentication systems
- **Location Tracking** - GPS coordinates with accuracy tracking
- **Capacity Management** - PWD seat availability and bus capacity

## 🚀 Development

### Available Scripts

#### Mobile App
```bash
npm start              # Start Expo development server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web
npm run start:fast    # Fast development mode
npm run reset         # Clear cache and restart
```

#### Admin Dashboard
```bash
npm start             # Start development server
npm run build         # Build for production
npm run test          # Run tests
```

### Development Tips
- Use `npm run start:fast` for faster mobile app reloading
- Enable Fast Refresh in Expo Dev Tools
- Use Expo Go app for faster development
- Check the SQL files documentation for database setup

## 📱 Usage Guide

### For Passengers
1. **Download the app** and grant location permissions
2. **View live map** to see buses in real-time
3. **Search routes** by origin and destination
4. **Check bus list** for available buses and PWD seats
5. **Track buses** with real-time updates

### For Admins
1. **Access dashboard** at `http://localhost:3000`
2. **Manage fleet** - add, edit, and track buses
3. **Assign drivers** to buses and routes
4. **Monitor performance** with analytics and reports
5. **Handle feedback** and user support

### For Bus Conductors
1. **Login** with bus conductor credentials
2. **Start session** and get assigned to a bus
3. **Update location** in real-time
4. **Report issues** and maintenance needs
5. **View schedule** and route information

## 🔐 Authentication

### Demo Credentials
- **Admin**: admin@metrobus.com / admin123
- **Bus Conductor**: gab.nakar@metrobus.com / demo123
- **Passenger**: Use the mobile app registration

### Security Features
- Row Level Security (RLS) policies
- JWT token authentication
- Session management
- Password hashing
- Role-based access control

## 📈 Performance

### Mobile App
- **Bundle Size**: Optimized with code splitting
- **Loading Speed**: Lazy loading and caching
- **Real-time Updates**: Efficient WebSocket connections
- **Location Tracking**: Optimized GPS usage

### Admin Dashboard
- **Responsive Design**: Works on all devices
- **Real-time Updates**: Live data synchronization
- **Performance**: Optimized database queries
- **Caching**: Smart data caching strategies

## 🚀 Deployment

### Mobile App
1. **Build for production**:
   ```bash
   expo build:android
   expo build:ios
   ```
2. **Deploy to app stores**:
   - Google Play Store (Android)
   - Apple App Store (iOS)

### Admin Dashboard
1. **Build for production**:
   ```bash
   npm run build
   ```
2. **Deploy to hosting**:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront

### Database
1. **Supabase hosting** (recommended)
2. **Self-hosted PostgreSQL** with Supabase client

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation files
- Contact the development team

## 🔮 Roadmap

### Planned Features
- [ ] Push notifications for bus arrivals
- [ ] Offline mode support
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Payment integration
- [ ] Advanced analytics
- [ ] Mobile app for admins
- [ ] API documentation

### Technical Improvements
- [ ] Unit and integration tests
- [ ] Performance monitoring
- [ ] Automated deployment
- [ ] CI/CD pipeline
- [ ] Code quality tools

## 📊 Project Statistics

- **Total Files**: 200+ files
- **SQL Files**: 41 essential database files
- **Screens**: 16 mobile app screens
- **Components**: 20+ reusable components
- **Database Tables**: 15+ core tables
- **Real-time Features**: Live tracking, updates, and notifications

---

**NaviGO** - Complete bus tracking solution for modern public transportation! 🚌✨

*Made with ❤️ for better public transportation experience*