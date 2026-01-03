// Get all DOM elements we need to interact with
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const compressBtn = document.getElementById("compressBtn");
const progress = document.getElementById("progress");
const progressBar = document.getElementById("progressBar");
const progressLog = document.getElementById("progressLog");
const result = document.getElementById("result");
const resultStats = document.getElementById("resultStats");
const qualityOptions = document.querySelectorAll(".quality-option");

// Store the selected PDF file
let selectedFile = null;

// When user clicks the upload area, trigger the hidden file input
uploadArea.addEventListener("click", () => fileInput.click());

// Handle drag over event (when file is dragged over the upload area)
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("dragover");
});

// Handle drag leave event (when file leaves the upload area)
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

// Handle drop event (when file is dropped)
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type === "application/pdf") {
    handleFile(files[0]);
  }
});

// Handle file selection from the file input dialog
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

// Handle quality option selection
qualityOptions.forEach((option) => {
  option.addEventListener("click", () => {
    qualityOptions.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    option.querySelector('input[type="radio"]').checked = true;
  });
});

// Process the selected file
function handleFile(file) {
  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
  fileInfo.classList.add("show");
  compressBtn.disabled = false;
  compressBtn.textContent = "Compress PDF";
  result.classList.remove("show");
  progressLog.classList.remove("show");
}

// Compress button
compressBtn.addEventListener("click", async () => {
  if (!selectedFile) return;

  const quality = document.querySelector('input[name="quality"]:checked').value;

  compressBtn.disabled = true;
  compressBtn.textContent = "Compressing...";
  progress.classList.add("show");
  progressLog.classList.add("show");
  progressLog.innerHTML =
    '<div class="progress-log-line">Starting compression...</div>';
  result.classList.remove("show");
  progressBar.style.width = "10%";

  try {
    const formData = new FormData();
    formData.append("pdf", selectedFile);
    formData.append("quality", quality);

    const response = await fetch("/compress", {
      method: "POST",
      body: formData,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));

          if (data.type === "progress") {
            // Add progress message with fade animation
            const logLine = document.createElement("div");
            logLine.className = "progress-log-line";
            logLine.textContent = `> ${data.message}`;
            progressLog.appendChild(logLine);
            while (progressLog.children.length > 15) {
              progressLog.removeChild(progressLog.firstChild);
            }
            progressLog.scrollTop = progressLog.scrollHeight;

            // Update progress bar
            const currentWidth = parseFloat(progressBar.style.width) || 10;
            if (currentWidth < 90) {
              progressBar.style.width = currentWidth + 2 + "%";
            }
          } else if (data.type === "complete") {
            // Compression complete
            progressBar.style.width = "100%";

            const logLine = document.createElement("div");
            logLine.className = "progress-log-line";
            logLine.textContent = "> Compression complete!";
            progressLog.appendChild(logLine);

            // Convert base64 to blob and download
            const binaryString = atob(data.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "application/pdf" });

            // Download file
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = data.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show results
            const reduction = (
              (1 - data.compressedSize / data.originalSize) *
              100
            ).toFixed(1);
            resultStats.innerHTML = `
                            Original: ${formatFileSize(data.originalSize)}<br>
                            Compressed: ${formatFileSize(
                              data.compressedSize
                            )}<br>
                            Reduced by: ${reduction}%
                        `;
            result.classList.add("show");
          } else if (data.type === "error") {
            alert("Compression failed: " + data.message);
          }
        }
      }
    }
  } catch (error) {
    alert("Error: " + error.message);
  } finally {
    setTimeout(() => {
      progress.classList.remove("show");
      progressBar.style.width = "0%";
    }, 1000);
    compressBtn.disabled = false;
    compressBtn.textContent = "Compress Another PDF";
  }
});

// Utility function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
