# Eye Trainer

Official Website: [https://tenzindann.com/eye-trainer/](https://tenzindann.com/eye-trainer/)

## Overview

Eye Trainer is a visual training app built with React + Vite, with optional desktop packaging via Electron.
This repository contains the core engine and demo interface used for eye movement and focus training routines.

## Core Features

- Multiple training modes (single mode and comprehensive loop mode)
- Canvas-based motion engine for smooth visual targets
- Light and dark themes with configurable dot palettes
- Web runtime (Vite) and desktop runtime (Electron)

## Project Structure

```text
src/           React app entry + engine integration
electron/      Electron main/preload process files
public/        Training visual assets
eyetrainer.jsx Main training UI component
```

## Local Development

```bash
npm install
npm run dev
```

## Desktop Development

```bash
npm run dev:desktop
```

## Build

```bash
npm run build:web
npm run build:desktop
```

## Notes

- The web build output is generated into `dist/`.
- Desktop packaging is managed by `electron-builder`.

