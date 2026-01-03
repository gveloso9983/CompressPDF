const express = require("express");
const multer = require("multer");
const { exec, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ dest: "uploads/" });

// Serve the HTML interface
app.use(express.static("public"));

// Compression endpoint
app.post("/compress", upload.single("pdf"), (req, res) => {
  const inputPath = req.file.path;
  const outputPath = path.join("uploads", `compressed_${Date.now()}.pdf`);
  const quality = req.body.quality || "ebook";

  // Get original filename and create compressed filename
  const originalName = req.file.originalname;
  const nameWithoutExt = path.parse(originalName).name;
  const compressedFileName = `${nameWithoutExt}-compressed.pdf`;

  // Ghostscript command (using gswin64c for Windows)
  let gsCommand;
  if (process.platform === "win32") {
    const commonPaths = [
      "C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe",
      "C:\\Program Files\\gs\\gs10.03.1\\bin\\gswin64c.exe",
      "C:\\Program Files (x86)\\gs\\gs10.06.0\\bin\\gswin64c.exe",
      "gswin64c",
    ];
    gsCommand = commonPaths.find((p) => fs.existsSync(p)) || "gswin64c";
  } else {
    gsCommand = "gs";
  }

  // Use spawn for streaming output
  const gsProcess = spawn(gsCommand, [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=/${quality}`,
    "-dNOPAUSE",
    "-dBATCH",
    `-sOutputFile=${outputPath}`,
    inputPath,
  ]);

  // Send initial response headers for streaming
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Stream stdout (progress messages)
  gsProcess.stdout.on("data", (data) => {
    const message = data.toString().trim();
    if (message) {
      res.write(`data: ${JSON.stringify({ type: "progress", message })}\n\n`);
    }
  });

  // Stream stderr (also contains progress info)
  gsProcess.stderr.on("data", (data) => {
    const message = data.toString().trim();
    if (message) {
      res.write(`data: ${JSON.stringify({ type: "progress", message })}\n\n`);
    }
  });

  // Handle completion
  gsProcess.on("close", (code) => {
    if (code !== 0) {
      res.write(
        `data: ${JSON.stringify({
          type: "error",
          message: "Compression failed",
        })}\n\n`
      );
      fs.unlinkSync(inputPath);
      res.end();
      return;
    }

    // Read the compressed file
    const compressedData = fs.readFileSync(outputPath);
    const compressedSize = compressedData.length;
    const originalSize = fs.statSync(inputPath).size;

    // Send completion message with file data
    res.write(
      `data: ${JSON.stringify({
        type: "complete",
        originalSize,
        compressedSize,
        data: compressedData.toString("base64"),
        filename: compressedFileName,
      })}\n\n`
    );

    // Clean up files
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    res.end();
  });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Create public directory if it doesn't exist
if (!fs.existsSync("public")) {
  fs.mkdirSync("public");
}

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`PDF Compressor running at http://localhost:${PORT}`);
  console.log("Make sure Ghostscript is installed on your system!");
});
