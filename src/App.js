// import dependencies
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import './App.css';

// constants
const TEST_GIFS = [
	'https://i.giphy.com/media/eIG0HfouRQJQr1wBzz/giphy.webp',
	'https://media3.giphy.com/media/L71a8LW2UrKwPaWNYM/giphy.gif?cid=ecf05e47rr9qizx2msjucl1xyvuu47d7kf25tqt2lvo024uo&rid=giphy.gif&ct=g',
	'https://media4.giphy.com/media/AeFmQjHMtEySooOc8K/giphy.gif?cid=ecf05e47qdzhdma2y3ugn32lkgi972z9mpfzocjj6z1ro4ec&rid=giphy.gif&ct=g',
	'https://i.giphy.com/media/PAqjdPkJLDsmBRSYUp/giphy.webp'
];

const pixelationFactor = 5;
const getPhantomWalletURL = 'https://phantom.app/';

const App = () => {
  // ----- States ----------
  const [walletAddress, setWalletAddress] = useState(null);
  const [pixelatedImageData, setPixelatedImageData] = useState(null);

  // ----- Actions ----------
  
  // determine whether a Phatom wallet is connected
  const checkForConnectedWallet = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) { // Phantom wallet found
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log('Connected with public key:', response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      } else {  // Phantom wallet not found
          console.log('Phantom wallet not found. Please get a Phantom wallet from https://phantom.app');
      }
    } catch (error) {  // Other error
          console.log('Wallet connection check failed', error);
      }
  };

  // connect Phantom wallet
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with public key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const getWallet = async () => {
    window.open(getPhantomWalletURL, '_blank').focus();
  };
  
  // handle file drop to Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    
    const imageFile = acceptedFiles[0];
    const { type: mimeType } = imageFile;

    const fileReader = new FileReader();
    fileReader.readAsDataURL(imageFile);
    fileReader.onload = (event) => {
      const imageAsBase64 = event.target.result;
      console.log("Image read as: ", imageAsBase64);

      const image = document.createElement('img');
      image.src = imageAsBase64;

      image.onload = () => {
        const width = Math.max(1, Math.floor(image.width));
        const height = Math.max(1, Math.floor(image.height));
          
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        console.log("Canvas dimensions are:", width, height);
  
        const context = canvas.getContext('2d', { alpha: false });
        context.drawImage(image, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height).data;
  
        for (let y = 0; y < height; y += pixelationFactor) {
          for (let x = 0; x < width; x += pixelationFactor) {
            const pixelIndex = (x + y * width) * 4;
            context.fillStyle = `rgba(
              ${imageData[pixelIndex]},
              ${imageData[pixelIndex + 1]},
              ${imageData[pixelIndex + 2]},
              ${imageData[pixelIndex + 3]}
            )`;
            context.fillRect(x, y, pixelationFactor, pixelationFactor);
          }
        }

        //setPixelatedImageData(canvas.toDataURL(mimeType));
        canvas.toBlob(
          blob => {
            const url = URL.createObjectURL(blob);
            setPixelatedImageData(url);
          }
        );
      }
    }
  }, []);

  // configure dropzone
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    rejectedFiles
  } = useDropzone({
    onDrop,
    multiple: false,
    minSize: 0,
    maxSize: 5245880,
    accept: 'image/*'
  });

  // handle image upload
  const uploadImage = () => {
    console.log("User pressed the submit button")
  }
  
  // ----- UI Renders ----------
  
  // render UI for when user doesn't have a Phantom wallet
  const renderNoWalletContainer = () => (
    <button className="cta-button get-wallet-button" onClick={getWallet}>
      Get Phantom Wallet
    </button>
  );
  
  // render UI for when user hasn't connected wallet yet
  const renderNotConnectedContainer = () => (
    <button className="cta-button connect-wallet-button" onClick={connectWallet}>
      Connect Phantom Wallet
    </button>
  );
  
  // render UI for when user has connected wallet
  const renderConnectedContainer = () => (
    <div className="connected-container">
      {
        pixelatedImageData? (
          <div className="image-preview">
            <img src={pixelatedImageData} style={{height: "80%"}}></img>
            <div>
            <button className="cta-button submit-image-button" onClick={uploadImage}>
              Submit
            </button>
            </div>
          </div>
        ) : (
          <div 
            {...getRootProps({
              className:`dropzone
              ${isDragAccept && 'dropzone-accept'}
              ${isDragReject && 'dropzone-reject'}`,
            })}>
          <input {...getInputProps()} />
            { isDragReject? (
              <p>Image files only!</p>
            ) : (
              <p>Drag and drop image to preview</p>
            )}
          </div>
        )
      }

      <div className="image-grid">
        
        {TEST_GIFS.map(gif => (
          <div className="image-item" key={gif}>
            <img src={gif} alt={gif} />
          </div>
        ))}
      </div>
    </div>
  );
  
  // ----- Use Effects ----------

  // on component mount, check for connected Phantom wallet
  useEffect(() => {
    const onLoad = async () => {
      await checkForConnectedWallet();
    };
    window.addEventListener('load', onLoad); // wait for window to fully load before checking for solana object
  }, []);

  
  // ----- Load App ----------
  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Pixelate</p>
          <p className="sub-text">
            Pixelate an image and store on Solana:
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
        </div>
      </div>
    </div>
  );
};
  

export default App;