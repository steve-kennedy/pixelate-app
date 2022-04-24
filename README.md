# Pixelate App
This project is an example Full Stack Web 3 app using Solana.

The web app takes a user submitted image, generates a lower-resolution pixelated version, and uploads the resulting image to the InterPlanetary File System (IPFS) for storage via a backend server. The file hash is then stored in Solana, allowing the newly generated image to be displayed on the web app.

The frontend is built with React, the backend server with NodeJS, and the database is a Solana program written in Rust.

The app can be seen at http://pixelate.stevekennedy.io.