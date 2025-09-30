# Virtual Vinyl Player

A beautiful virtual vinyl player with comprehensive Spotify integration, built with Next.js 14 and modern web technologies.

## ✨ Features

- 🎵 **Complete Spotify Integration** - Full API integration with playback controls
- 💿 **Realistic Vinyl UI** - Animated vinyl record with album artwork and tonearm
- 🔐 **OAuth 2.0 Authentication** - Secure login with automatic token refresh
- 🎛️ **Advanced Playback** - Play, pause, skip, volume control via Spotify Web API
- 📚 **User Library** - Access playlists, liked songs, and recently played tracks
- 🎨 **Smooth Animations** - Spinning vinyl, moving tonearm, and progress tracking
- 📱 **Responsive Design** - Works perfectly on all devices
- 🔄 **Real-time Updates** - Live playback state and progress synchronization
- 🎯 **Smart Search** - Enhanced search with user authentication for better results
- 📊 **Rich Metadata** - Complete track, album, and artist information display

## 🛠️ Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Full type safety and IntelliSense
- **TailwindCSS** - Modern utility-first styling
- **Framer Motion** - Smooth animations and transitions
- **shadcn/ui** - Accessible UI components
- **Axios** - HTTP client for API requests
- **Spotify Web API** - Complete music platform integration

## 🚀 Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Spotify API**:
   - Copy `.env.example` to `.env.local`
   - Get credentials from [Spotify Dashboard](https://developer.spotify.com/dashboard)
   - Add your Client ID and Secret to `.env.local`

3. **Run the app**:
   ```bash
   npm run dev
   ```

4. **Open** `http://localhost:3000`

## 🔧 Environment Files

- **`.env.example`** - Template for setup
- **`.env`** - Production deployment

## 🎮 Usage

### Basic Features (Guest Mode)
1. **Search** for songs using the search bar
2. **Select a track** from results to see vinyl animations
3. **Play previews** with 30-second audio samples
4. **Watch** the tonearm move and record spin

### Premium Features (Spotify Login Required)
1. **Login with Spotify** for full access to your music library
2. **Browse multiple tabs**:
   - **Search**: Enhanced search with 20 results
   - **Playlists**: View and play from your Spotify playlists
   - **Liked Songs**: Access your saved tracks
   - **Recently Played**: See your listening history
3. **Full playback control**:
   - Play/pause/skip tracks via Spotify
   - Volume control and progress tracking
   - Real-time playback state synchronization
4. **Rich metadata display** with complete track information

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   │   ├── callback/  # OAuth callback handler
│   │   │   ├── logout/    # User logout
│   │   │   └── status/    # Auth status check
│   │   ├── search/        # Track search functionality
│   │   ├── playlists/     # User playlists endpoint
│   │   ├── playback/      # Playback control (play/pause/skip/volume)
│   │   └── user/          # User data (profile/saved/recent)
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── VinylRecord.tsx    # Animated vinyl record
│   ├── Tonearm.tsx        # Moving tonearm component
│   ├── AuthButton.tsx     # Login/logout button
│   └── ui/               # Reusable UI components
└── lib/                  # Utilities and services
    ├── spotify.ts        # Complete Spotify API integration
    └── utils.ts          # Helper functions
```

## 🔐 Authentication & API Integration

### Authentication Flow
- **Guest Mode**: Basic search with 10 results using client credentials
- **Spotify Login**: Full access to user library with enhanced search (20 results)
- **OAuth 2.0**: Secure authorization code flow with PKCE
- **Automatic Refresh**: Token refresh handled transparently
- **Secure Storage**: HTTP-only cookies for token storage

### API Endpoints

#### Authentication
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/callback` - OAuth callback handler
- `POST /api/auth/logout` - Clear user session

#### Music Data
- `GET /api/search?q={query}` - Search for tracks
- `GET /api/playlists` - Get user playlists (authenticated)
- `GET /api/user` - Get user profile, saved tracks, recently played (authenticated)

#### Playback Control
- `GET /api/playback` - Get current playback state and devices (authenticated)
- `PUT /api/playback` - Control playback (play/pause/skip/volume) (authenticated)

### Spotify App Configuration

1. **Create Spotify App** at [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. **Set Redirect URI** to: `http://localhost:3000/api/auth/callback` (development)
3. **Configure Scopes**:
   - `user-read-private` - Access user profile
   - `user-read-email` - Access email address
   - `playlist-read-private` - Access private playlists
   - `playlist-read-collaborative` - Access collaborative playlists
   - `user-library-read` - Access saved tracks
   - `user-read-recently-played` - Access recently played tracks
   - `user-read-playback-state` - Access playback state
   - `user-modify-playback-state` - Control playback
   - `user-read-currently-playing` - Access currently playing track

## 🚀 Deployment

1. **Environment Setup**:
   - Copy `.env.example` to `.env`
   - Add your Spotify Client ID and Secret
   - Set production redirect URI in Spotify dashboard

2. **Deploy to Production**:
   - Deploy to Vercel/Netlify with environment variables
   - Update Spotify app with production redirect URI
   - Ensure all scopes are configured for full functionality

3. **Production Checklist**:
   - ✅ Spotify credentials configured
   - ✅ Redirect URI updated in Spotify dashboard
   - ✅ All required scopes enabled
   - ✅ Environment variables set in deployment platform

## 📄 License

MIT License - free to use for your projects.
