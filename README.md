# Knowledge Runner - A Phaser-based Quiz Game

This is a web-based quiz game built with Phaser, React, and TypeScript. The game challenges players with a series of multiple-choice questions on various topics, with a focus on food safety and general knowledge.

## Features

-   Engaging quiz gameplay powered by the Phaser game engine.
-   A responsive user interface built with React and TypeScript.
-   A growing pool of questions with varying difficulty levels.
-   Score tracking and session management.
-   Vercel deployment ready.

## Project Structure

The project is structured as a modern web application, with a clear separation of concerns between the game logic and the UI components.

```
.
├── public/              # Static assets (images, data)
├── src/                 # Source code
│   ├── components/      # React components
│   ├── scenes/          # Phaser game scenes
│   ├── services/        # Game logic and API services
│   └── types/           # TypeScript type definitions
├── index.html           # Main HTML entry point
├── main.tsx             # React application entry point
├── package.json         # Project dependencies and scripts
└── vite.config.js       # Vite configuration
```

## Getting Started

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd aithucchien-bang3-actfunc
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application

1.  **Start the development server:**
    ```bash
    npm run dev
    ```
2.  **Open your browser:**
    Navigate to `http://localhost:5173` (or the port specified in the console).

## Available Scripts

-   `npm run dev`: Starts the development server with hot-reloading.
-   `npm run build`: Builds the application for production.
-   `npm run lint`: Lints the codebase for errors.
-   `npm run preview`: Serves the production build locally for testing.

## Deployment

This project is configured for easy deployment on Vercel.

1.  **Install the Vercel CLI:**
    ```bash
    npm i -g vercel
    ```
2.  **Deploy the application:**
    ```bash
    vercel --prod
