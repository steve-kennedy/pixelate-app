// server configuration
const path = require("path");
const express = require("express");
const app = express();
const publicPath = path.join(__dirname, '..', "build");
const port = process.env.PORT || 8001;
app.use(express.static(publicPath));

// multer configuration for temporary image storage
const cors = require('cors');
app.use(cors());
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage }).single('file');

// pinata configuration for final image storage
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK("a6a0a3d5ece75b3766b0", "40d293bbee825b43947d87a7a620c348e8cc16f4551515d63f6604d9e5eefeeb");
const fs = require('fs');

// upload pixelated file from client to server
app.post('/upload', (req, res) => {
  upload(req, res, error => {
    if (error instanceof multer.MulterError) {
      return res.status(500).json(error);
    } else if (error) {
      return res.status(500).json(error);
    }
    const filePath = req.file.path;
    console.log("File uploaded, with path:", filePath);
    const readableStreamForFile = fs.createReadStream(filePath);
    const options = {
      pinataMetadata: {
        name: "Test Name",
        keyvalues: {
          description: "Test description"
        }
      }
    };
    pinata.pinFileToIPFS(readableStreamForFile, options).then((result) => {
      console.log("File pinned:", result);
      console.log("Attempting to remove local file...");
      fs.unlink(filePath, (error) => {
        if (error) {
          console.log("Failed to remove local file:", error);
        } else {
          console.log("Successfully removed local file");
        }
      });

    }).catch((error) => {
      console.log("Failed to pin:", error);
    });
    
  });
});



app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, () => console.log(`App listening at port: ${port}`));