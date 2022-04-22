// server configuration
const path = require("path");
const express = require("express");
const app = express();
const publicPath = path.join(__dirname, '..', "build");
const keypair = require("./keypair.json");
const port = process.env.PORT || 8001;
app.use(express.static(publicPath));

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

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
const pinataAPIKey = process.env.PINATA_API_KEY;
const pinataAPISecret = process.env.PINATA_API_SECRET;
const pinataSDK = require('@pinata/sdk');
const pinata = pinataSDK(pinataAPIKey, pinataAPISecret);
const fs = require('fs');

const removeFile = async (filePath) => {
  fs.unlink(filePath, (error) => {
    if (error) {
      console.log("Failed to remove local file:", error);
    } else {
      console.log("Successfully removed local file");
    }
  });
}

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
        name: "Pixelate",
        keyvalues: {
          description: "Image pixelated via the Pixelate App @https://stevekennedy.io/pixelate"
        }
      }
    };
    pinata.pinFileToIPFS(readableStreamForFile, options).then((result) => {
      console.log("File pinned:", result);
      console.log("File hash is:", result.IpfsHash);
      console.log("Attempting to remove temporary file...");
      removeFile(filePath);

      if (result.isDuplicate === true) {
        console.log("Image is a duplicate on IPFS!");
        res.send(result.IpfsHash);
        
      } else {
        console.log("Sending IPFS hash to client:", result.IpfsHash);
        res.send(result.IpfsHash);
      }

    }).catch((error) => {
      console.log("Failed to pin:", error);
      console.log("Attempting to remove temporary file...")
      removeFile(filePath);
      res.status(500).json(error);
    });
    
  });
});

app.get('/keypair', (req, res) => {
  res.send(keypair);
})

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.listen(port, () => console.log(`App listening at port: ${port}`));