# VybeCheck

An interactive quiz platform for Twitter Spaces that matches participants based on their responses to questions generated from live discussions.

## Overview

VybeCheck transforms Twitter Spaces conversations into engaging quizzes where participants answer rapid-fire true/false questions. Instead of scoring for "correct" answers, the platform matches participants based on response agreement—the more questions two people answer the same way, the higher their similarity score.

### Key Features

- **Real-time Quiz Participation**: Answer questions during live Twitter Spaces with 5-10 second response windows
- **Long-running Sessions**: Quizzes remain active for 2-3 months after the Space ends, allowing asynchronous participation
- **Intelligent Matching**: Participants are matched based on answer agreement rather than correctness
- **Tiered Visualizations**: Multiple result display modes including radar charts and detailed breakdowns
- **Credit-based Monetization**: Premium features and insights available through credit purchases

## Tech Stack

- **Backend**: Node.js + Express
- **Real-time Communication**: WebSockets
- **Language**: TypeScript (ES2022, strict mode)
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run build     # Compile TypeScript to dist/
npm run dev       # Build and start development server
npm start         # Start production server (requires prior build)
```

Access the app at `http://localhost:3000`

### Testing

```bash
npm test                    # Run all tests
npm test -- --ui            # Run tests with UI
npm test -- --coverage      # Run with coverage report
npm test QuizSession        # Run specific test file
```

## Project Structure

```
src/
├── server.ts          # Main server entry point
├── client.ts          # Client-side logic
├── shared/
│   └── types.ts       # Shared TypeScript interfaces
dist/                  # Compiled output
public/                # Static assets
```

## Development Roadmap

For detailed development plans and phase breakdowns, see [WARP.md](WARP.md)

## Contributing

Contributions are welcome! Please ensure all tests pass before submitting a pull request.

## License

MIT
