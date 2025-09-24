# Virtual Vinyl Player

A beautiful virtual vinyl player with Spotify integration, built with Next.js 14 and modern web technologies.

## ✨ Features

- 🎵 **Spotify Integration** - Search and play real music from Spotify
- 💿 **Realistic Vinyl UI** - Animated vinyl record with album artwork
- 🔐 **User Authentication** - OAuth login with Spotify
- 🎛️ **Audio Playback** - 30-second previews with smooth controls
- 🎨 **Smooth Animations** - Spinning vinyl and moving tonearm
- 📱 **Responsive Design** - Works on all devices

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **shadcn/ui** - UI components

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

1. **Search** for songs using the search bar
2. **Login with Spotify** for enhanced features
3. **Select a track** from results
4. **Play** to see vinyl animations and hear previews
5. **Watch** the tonearm move and record spin

## 📁 Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes (search, auth)
│   └── page.tsx        # Main page
├── components/         # React components
│   ├── VinylRecord.tsx # Vinyl component
│   ├── Tonearm.tsx     # Tonearm component
│   └── AuthButton.tsx  # Login/logout button
└── lib/               # Utilities
    └── spotify.ts     # Spotify API helpers
```

## 🔐 Authentication

- **Guest Mode**: Basic search with 10 results
- **Spotify Login**: Enhanced search with 20 results
- **Automatic**: Token refresh and secure storage

## 🚀 Deployment

1. Copy `.env.example` to `.env`
2. Add production Spotify credentials
3. Deploy to Vercel/Netlify with environment variables
4. Update Spotify app with production redirect URI

## 📄 License

MIT License - free to use for your projects.
