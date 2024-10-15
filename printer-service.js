const WebSocket = require("ws");
const os = require("os");
const { exec } = require("child_process");

const wss = new WebSocket.Server({ port: 8080 });

let getPrinters;
let printContent;

if (os.platform() === "darwin") {
  getPrinters = () => {
    return new Promise((resolve, reject) => {
      exec("lpstat -p | awk '{print $2}'", (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        const printers = stdout.trim().split("\n");
        resolve({
          default: printers[0],
          all: printers.map((name) => ({ name })),
        });
      });
    });
  };

  printContent = (printerName, content, barcodeData) => {
    return new Promise((resolve, reject) => {
      const barcodeCommand = generateBarcodeOrQRCode(
        barcodeData.data,
        barcodeData.type
      );

      // Convert content to a buffer
      const contentBuffer = Buffer.from(content);

      // Paper cut command (partial cut)
      const cutCommand = Buffer.from([0x1d, 0x56, 0x01]);

      // Add a line feed after the barcode
      const lineFeed = Buffer.from([0x0a]);

      // Combine barcode/QR code command, line feed, content, and cut command
      const fullContent = Buffer.concat([
        barcodeCommand,
        lineFeed,
        contentBuffer,
        cutCommand,
      ]);

      const tempFile = `/tmp/print_content_${Date.now()}.bin`;
      require("fs").writeFileSync(tempFile, fullContent);

      const printCommand = `lp -d "${printerName}" "${tempFile}"`;

      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }

        // Clean up temp file
        setTimeout(() => {
          require("fs").unlinkSync(tempFile);
        }, 5000);
      });
    });
  };
} else if (os.platform() === "win32") {
  const { WindowsApi } = require("node-windows");
  const api = new WindowsApi();

  getPrinters = () => {
    return new Promise((resolve, reject) => {
      api.Printer.getDefaultPrinter((err, printer) => {
        if (err) {
          reject(err);
        } else {
          api.Printer.enumPrinters((err, printers) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                default: printer,
                all: printers,
              });
            }
          });
        }
      });
    });
  };

  printContent = (printerName, content, barcodeData) => {
    return new Promise((resolve, reject) => {
      const barcodeCommand = generateBarcodeOrQRCode(
        barcodeData.data,
        barcodeData.type
      );

      // Convert content to a buffer
      const contentBuffer = Buffer.from(content);

      // Add a line feed after the barcode
      const lineFeed = Buffer.from([0x0a]);

      // Combine barcode/QR code command, line feed, and content
      const fullContent = Buffer.concat([
        barcodeCommand,
        lineFeed,
        contentBuffer,
      ]);

      const tempFile = `${os.tmpdir()}\\print_content_${Date.now()}.bin`;
      require("fs").writeFileSync(tempFile, fullContent);

      const printCommand = `type "${tempFile}" > "${printerName}"`;

      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }

        // Clean up temp file
        setTimeout(() => {
          require("fs").unlinkSync(tempFile);
        }, 5000);
      });
    });
  };
} else {
  getPrinters = () => {
    return new Promise((resolve, reject) => {
      exec("lpstat -p | awk '{print $2}'", (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        if (stderr) {
          reject(new Error(stderr));
          return;
        }
        const printers = stdout.trim().split("\n");
        resolve({
          default: printers[0], // Assuming the first printer is default
          all: printers.map((name) => ({ name })),
        });
      });
    });
  };

  printContent = (printerName, content, barcodeData) => {
    return new Promise((resolve, reject) => {
      const barcodeCommand = generateBarcodeOrQRCode(
        barcodeData.data,
        barcodeData.type
      );

      // Convert content to a buffer
      const contentBuffer = Buffer.from(content);

      // Paper cut command (partial cut)
      const cutCommand = Buffer.from([0x1d, 0x56, 0x01]);

      // Add a line feed after the barcode
      const lineFeed = Buffer.from([0x0a]);

      // Combine barcode/QR code command, line feed, content, and cut command
      const fullContent = Buffer.concat([
        barcodeCommand,
        lineFeed,
        contentBuffer,
        cutCommand,
      ]);

      const tempFile = `/tmp/print_content_${Date.now()}.bin`;
      require("fs").writeFileSync(tempFile, fullContent);

      const printCommand = `lp -d "${printerName}" "${tempFile}"`;

      exec(printCommand, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else if (stderr) {
          reject(new Error(stderr));
        } else {
          resolve(stdout);
        }

        // Clean up temp file
        setTimeout(() => {
          require("fs").unlinkSync(tempFile);
        }, 5000);
      });
    });
  };
}

function generateBarcodeOrQRCode(data, type) {
  const scanMeMessage = Buffer.from([
    0x1b,
    0x61,
    0x01, // Center align
    0x1b,
    0x21,
    0x00, // Normal text size
    ...Buffer.from("SCAN ME"),
    0x0a, // Line feed
    0x1b,
    0x61,
    0x00, // Left align (reset alignment)
  ]);

  if (type === "qr") {
    // ESC/POS commands to generate a QR code
    const qrCodeCommand = Buffer.from([
      0x1b,
      0x61,
      0x01, // Center align
      0x1d,
      0x28,
      0x6b,
      0x04,
      0x00,
      0x31,
      0x41,
      0x32,
      0x00, // Select QR code model
      0x1d,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x43,
      0x06, // Set QR code size
      0x1d,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x45,
      0x31, // Set error correction level
      0x1d,
      0x28,
      0x6b,
      data.length + 3,
      0x00,
      0x31,
      0x50,
      0x30,
      ...Buffer.from(data), // Store QR code data
      0x1d,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x51,
      0x30, // Print QR code
      0x1b,
      0x61,
      0x00, // Left align (reset alignment)
      0x0a, // Single line feed
    ]);
    return Buffer.concat([qrCodeCommand, scanMeMessage]);
  } else if (type === "barcode") {
    // ESC/POS commands to generate a barcode (Code 128 in this example)
    const barcodeCommand = Buffer.from([
      0x1b,
      0x61,
      0x01, // Center align
      0x1d,
      0x68,
      0x50, // Set barcode height to 80 dots
      0x1d,
      0x77,
      0x02, // Set barcode width (1-6)
      0x1d,
      0x48,
      0x02, // Set HRI character position (below barcode)
      0x1d,
      0x66,
      0x00, // Select font for HRI characters
      0x1d,
      0x6b,
      0x49, // Select barcode type (49 for Code 128)
      data.length,
      ...Buffer.from(data),
      0x00, // Print barcode (type 73: Code 128)
      0x1b,
      0x61,
      0x00, // Left align (reset alignment)
      0x0a, // Single line feed
    ]);
    return Buffer.concat([barcodeCommand, scanMeMessage]);
  } else {
    throw new Error("Unsupported barcode type");
  }
}

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      console.log("Received message:", data);

      if (data.type === "GET_PRINTERS") {
        const printers = await getPrinters();
        ws.send(JSON.stringify({ type: "PRINTERS_LIST", printers }));
      } else if (data.type === "PRINT") {
        console.log("Print request received:", data);
        try {
          await printContent(data.printerName, data.content, data.barcodeData);
          ws.send(
            JSON.stringify({ type: "PRINT_ACKNOWLEDGED", status: "success" })
          );
        } catch (printError) {
          console.error("Error printing:", printError);
          ws.send(
            JSON.stringify({ type: "PRINT_ERROR", message: printError.message })
          );
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(JSON.stringify({ type: "ERROR", message: error.message }));
    }
  });

  // Send initial printer list
  getPrinters()
    .then((printers) => {
      ws.send(JSON.stringify({ type: "PRINTERS_LIST", printers }));
    })
    .catch((error) => {
      console.error("Error getting printers:", error);
      ws.send(JSON.stringify({ type: "ERROR", message: error.message }));
    });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("Printer service running on ws://localhost:8080");
