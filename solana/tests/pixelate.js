const anchor = require('@project-serum/anchor');
const { SystemProgram } = require('@solana/web3.js');

const main = async() => {
  console.log("Starting test...")

  // create and set provided (will need to communicate with frontend)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Pixelate;

  // create account keypair for program
  const baseAccount = anchor.web3.Keypair.generate();

  // call start_stuff_off and pass it needed params
  let tx = await program.rpc.startStuffOff({
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    },
    signers: [baseAccount],
  });

  console.log("Your transaction signature", tx);

  // fetch data from the base account
  let account = await program.account.baseAccount.fetch(baseAccount.publicKey);
  console.log('Image count:', account.totalImages.toString());

  // call add_image function
  await program.rpc.addImage("QmX2osZ8n26X8cbKbcfKxPeYK2AeAN2NTQCbCm8QzKv6YL", {
    accounts: {
      baseAccount: baseAccount.publicKey,
      user: provider.wallet.publicKey,
    },
  });

  // get the account again to see changes
  account = await program.account.baseAccount.fetch(baseAccount.publicKey);
  console.log('Image count:', account.totalImages.toString());
  console.log('Image list:', account.imageList);

}

const runMain = async () => {
  try {
    await main();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runMain();