const fs = require("fs");
const Web3 = require("web3");
const mnemonic = "***"
const truffleURL = "***"
const HDWalletProvider = require("@truffle/hdwallet-provider");
const provider = new HDWalletProvider(mnemonic, truffleURL)
const web3 = new Web3(provider);
const campaignFactory_abi = JSON.parse(fs.readFileSync('./build/__contracts_campaign_sol_CampaignFactory.abi'));
const campaignFactory_bytecode = fs.readFileSync('./build/__contracts_campaign_sol_CampaignFactory.bin');
const deploy = async() => {
    accounts = await web3.eth.getAccounts()
    console.log("Trying to deploy from accounts ", accounts[0]);
    campaignFactory = await 
    new web3.eth.Contract(campaignFactory_abi)
        .deploy({ 
            data: '0x'+campaignFactory_bytecode, 
        }).send({
            from: accounts[0], 
            gas:'1000000'
    });
    console.log('contract deployed to',campaignFactory.options.address);
    process.exit();             
};
deploy();