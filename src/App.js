// ----- Dependencies ----------
// React app
import React, { useEffect, useState, useCallback } from 'react';
import './App.css';
// File handling
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
// Solana
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';

// ----- Constants ----------
// Solana configuration
const { SystemProgram, Keypair } = web3;
const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl('devnet');
const opts = { preflightCommitment: "finalized"};
// Image configuration
const pixelationFactor = 5;
// Other
const getPhantomWalletURL = 'https://phantom.app/';

const App = () => {
  // ----- States ----------
  const [walletAddress, setWalletAddress] = useState(null);
  const [baseAccount, setBaseAccount] = useState(null);
  const [pixelatedImageURL, setPixelatedImageURL] = useState(null);
  const [imageList, setImageList] = useState([]);

  // ----- Actions ----------
  // get Solana base account keypair
  const getBaseAccount = async () => {
    console.log("Attempting to get base account...");
    axios.get('/keypair')
      .then((res) => {
        console.log("Base account request completed:", res);
        const kp = res.data;
        const arr = Object.values(kp._keypair.secretKey);
        const secret = new Uint8Array(arr);
        const baseAccount = web3.Keypair.fromSecretKey(secret);
        setBaseAccount(baseAccount);
      }).catch((error) => {
        console.log("Failed to get Base Account:", error);
        setBaseAccount(null);
        // TODO handle error
      })
  };

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
  
  // setup authenticated solana connection. requires connected wallet
  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  };

  // initialize Solana base account
  const createImageAccount = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("Creating new image account...");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString());
      await getImageList();

    } catch (error) {
      console.log("Error creating BaseAccount:", error);
    };
  };

  // get images from Solana
  const getImageList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Connected to base account:", account);
      setImageList(account.imageList);
    } catch (error) {
      console.log("Error in fetching image list:", error);
      setImageList(null);
    };
  };

  // handle file drop to Dropzone
  const onDrop = useCallback((acceptedFiles) => {
    
    const imageFile = acceptedFiles[0];
    console.log("Image file is: ", imageFile);
    const { type: mimeType } = imageFile;

    const dropReader = new FileReader();
    dropReader.readAsDataURL(imageFile);
    dropReader.onload = (event) => {
      const imageAsBase64 = event.target.result;
      console.log("Image as base64 is: ", imageAsBase64);

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

        const pixImgURL = canvas.toDataURL("image/png");
        setPixelatedImageURL(pixImgURL);
      }
    }
  }, []);

  // configure dropzone
  const {
    getRootProps,
    getInputProps,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    multiple: false,
    minSize: 0,
    maxSize: 5245880,
    accept: 'image/*'
  });

  // handle image upload
  const uploadImage = async () => {
    console.log("User pressed the submit button...");
    
    const base64 = await fetch(pixelatedImageURL);
    const blob = await base64.blob();
    const imageFile = new File([blob], "file.png", {lastModified: Date.now(), type: "image/png"} );

    const data = new FormData();
    data.append("file", imageFile, "file.png");
    console.log("File for upload is:", imageFile);

    axios.post(`${window.location.origin.toString()}/upload`, data, {})
      .then((res) => {
        console.log("File sucessfully uploaded to IPFS server", res)

        const cid = res.data;
        console.log("Adding image to Solana with CID:", cid);
        createImage(cid);
    
    }).catch((error) => {
        console.log("Error uploading file to server:", error);
        // TODO handle error
    });
  };

  // send cid to Solana program and store image object
  const createImage = async (cid) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addImage(cid, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("Image successfully sent to Solana program", cid);
      await getImageList();

    } catch (error) {
      console.log("Error sending image to Solana program:", error);
      // TODO handle error
    }
  }

  // ----- UI Renders ----------
  // render UI for when user hasn't connected wallet yet
  const renderNotConnectedContainer = () => (
    <div className="header-container">
      <div>
        <button className="cta-button connect-wallet-button" onClick={connectWallet}>
          Connect Phantom Wallet
        </button>
      </div>
      <div>
        <button className="cta-button get-wallet-button" onClick={getWallet}>
          Get Phantom Wallet
        </button>
      </div>
    </div>
  );
  
  // render UI for when user has connected wallet
  const renderConnectedContainer = () => {
    // program account hasn't been initialized, display create account button
    if (imageList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-image-button" onClick={createImageAccount}>
                One-Time Initialization for Image Program Account
          </button>
        </div>
      )
    } 
    
    // program account exists, display upload field and image list
    else {
      return(
        <div className="connected-container">
        {
          pixelatedImageURL? (
            <div className="image-preview">
              <img src={pixelatedImageURL} alt={"Preview of your pixelated image."} style={{height: "80%"}}></img>
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
          
          {imageList.map((item, index) => (
            <div className="image-item" key={index}>
              <img src={`https://ipfs.io/ipfs/${item.imageCid}`} alt={""} />
            </div>
          ))}
        </div>
      </div>
      )
    }
  };
  
  // ----- Use Effects ----------
  // request base account from server
  useEffect(() => {
    if (!baseAccount) {
      console.log("Fetching base account...")
      getBaseAccount();
    }
  }, []);
  
  // check for connected Phantom wallet - must be once page fully loaded
  useEffect(() => {
    const onLoad = async () => {
      await checkForConnectedWallet();
    };
    window.addEventListener('load', onLoad);
  }, []);

  // get image list from Solana program
  useEffect(() => {
    if (walletAddress && baseAccount) {
      console.log("Fetching image list...");
      getImageList();
    }
  }, [walletAddress, baseAccount]);

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