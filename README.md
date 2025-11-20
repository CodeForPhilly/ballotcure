# BallotCure

A web application for visualizing and searching Philadelphia ballot deficiency data from the 2024 General Election. The application provides an interactive map interface to explore ballot issues by division and search for individual voter records.

## About This Project

BallotCure helps voters and election officials identify and track mail-in ballot deficiencies in Philadelphia. Users can:

- Search for voters by name to see their ballot status
- Click on map divisions to view all ballot deficiencies in that area
- View statistics showing the number of deficient ballots per division
- Automatically detect and display the user's voting division based on their location

## Architecture Note

This project was originally developed with a Supabase backend for real-time data management. As the election data became finalized and no longer required updates, the project was archived with a static data snapshot (November 2024). The application now runs entirely client-side using static JSON files, eliminating the need for a backend database.

## Technology Stack

- **Frontend Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **Mapping**: MapLibre GL JS
- **Data**: Static JSON files (3,341 ballot records, 1,374 divisions)

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
