# PDF Image Compressor

A web-based tool for compressing image-heavy PDFs while maintaining readability. Built with Node.js and Ghostscript.

## Features

- Compress PDFs with many images efficiently
- Real-time progress feedback with terminal-style output
- Three compression quality levels (72, 150, or 300 DPI)
- Typical file size reduction of 50-80%
- Drag-and-drop interface
- Preserves original filename with "-compressed" suffix

## Requirements

- Node.js (v14 or higher)
- Ghostscript (v10.x)

## Installation

### Install Ghostscript

**Windows:**

1. Download from [ghostscript.com](https://ghostscript.com/releases/gsdnld.html)
2. Run the installer
3. Add Ghostscript to PATH:
   - Open System Environment Variables
   - Edit Path variable
   - Add: `C:\Program Files\gs\gs10.06.0\bin`
4. Restart your terminal

**Mac:**

```bash
brew install ghostscript
```

**Linux:**

```bash
sudo apt-get install ghostscript
```

### Install Node Dependencies

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

Open your browser to `http://localhost:3000`

Upload a PDF, select compression quality, and compress. You will be prompted to select the download location once compression is finished.

## Compression Levels

- **Maximum (72 DPI)** - Smallest file size, good for screen viewing
- **Balanced (150 DPI)** - Recommended for most uses
- **High Quality (300 DPI)** - Print quality, larger file size

## Project Structure

```
pdf-compressor/
├── package.json
├── server.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── uploads/          (created automatically)
```

## How It Works

The server uses Ghostscript to downsample and recompress images within PDFs. Text remains sharp as it's treated as vector data rather than rasterized content.

For large files, compression may take several minutes. Progress is displayed in real-time so you can monitor the process.
