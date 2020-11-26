const assert = require("assert");
const ganache = require("ganache-cli");
const fs = require("fs");
const Web3 = require("web3");
const web3 = new Web3(ganache.provider());
const campaign_abi = JSON.parse(fs.readFileSync('./build/__contracts_campaign_sol_Campaign.abi'));
const campaign_bytecode = fs.readFileSync('./build/__contracts_campaign_sol_Campaign.bin');
const campaignFactory_abi = JSON.parse(fs.readFileSync('./build/__contracts_campaign_sol_CampaignFactory.abi'));
const campaignFactory_bytecode = fs.readFileSync('./build/__contracts_campaign_sol_CampaignFactory.bin');

var accounts;
var campaignFactory;
var campaignAddress;
var campaign;

beforeEach(async () => { 

    accounts = await web3.eth.getAccounts()

    campaignFactory = await 
    new web3.eth.Contract(campaignFactory_abi)
        .deploy({ 
            data: '0x'+campaignFactory_bytecode, 
        }).send({
            from: accounts[0], 
            gas:'1000000'
    });

    await campaignFactory.methods.createCampaign('1').send({
        from: accounts[0],
        gas: '1000000'
    });

    const listAddresses = await campaignFactory.methods.getDeployedCampaigns().call(); 
    campaignAddress = listAddresses[0];
    campaign = await 
    new web3.eth.Contract(campaign_abi, campaignAddress) ;

    /*campaign = await 
    new web3.eth.Contract(campaign_abi, campaignAddress)        
        .deploy({ 
            data: '0x'+campaign_bytecode, 
            arguments: [999,campaignAddress]
    });*/

});

describe('Campaign', async() => {

    it('deploys a campaignFactory contract', async() => {
    assert.ok(campaignFactory.options.address);
    });

    it('deploys a campaign contract', async() => {
        assert.ok(campaign.options.address);
    });

    it('manager is address of the person who is create', async() => {
        const manager = await campaign.methods.manager().call();
        assert.strictEqual(accounts[0],manager);
    });

    /* จงใจให้เกิด error คือ ให้ account 0 ส่งเงินมาแค่ 0 ซึ่ง 0<1 เกิด error จึงนับว่าผ่าน */
    it('require minimumContribution of ether to enter ', async() => {
        var pass = "ok"
        try {
            await campaign.methods.contribute().send({
                from: accounts[0],
                value: web3.utils.toWei("0", "ether")
            });
        } 
        catch (err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);
    });

    /*จงใจให้เกิด error ให้ account 1 กด create request เกิด error จึงนับว่าผ่าน*/
    it ('only manager can call createRequest', async () => {
        var pass = "ok";
        try {
            await campaign.methods.contribute().send({
                from: accounts[0],
                value: web3.utils.toWei("1", "ether")
            });
            await campaign.methods.createRequest().send({
                from: accounts[1]
            });
        }
        catch(err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);

        
    });

    it ('only approvers can call approveRequest', async () => {
        //check approvers
        /* จงใจให้เกิด error โดยให้ acc 0 เป็น contribute และทำการ approveRequest มาจาก acc1 เกิด error จึงนับว่าผ่าน*/
        var pass = "ok";
        try {
            await campaign.methods.contribute().send({
                from: accounts[0],
                value: web3.utils.toWei("1", "ether")
            });
            await campaign.methods.approveRequest().send({
                from: accounts[1]
            });
        }
        catch(err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);

        //check approvers never voted before
        /* จงใจให้เกิด error โดยให้ acc 0 เป็น contribute และทำการ approveRequest แต่ aprrovals มาจาก acc1 เกิด error จึงนับว่าผ่าน*/
        try {
            await campaign.methods.contribute().send({
                from: accounts[0],
                value: web3.utils.toWei("1", "ether")
            });
            await campaign.methods.approveRequest().send({
                from: accounts[0]
            });
            await campaign.methods.approvals().send({
                from: accounts[1]
            });
        }
        catch(err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);
    });

    it('only manager can call finalizeRequest', async() => {
        //check manager
        const manager = await campaign.methods.manager().call();
        assert.strictEqual(accounts[0],manager);

        //check approvalCount > (approversCount / 2)
        /* จงใจให้เกิด error มีการสร้าง request คน approvers มี3 accounts[1,2,3] คน 
        approvals มีแค่1คน accounts[1] แล้วmanager เรียก request เกิด error จึงนับว่าผ่าน  */
        var pass = "ok";

        try {
            await campaign.methods.createRequest().send({
                from: accounts[0]
            });

            await campaign.methods.contribute().send({
                from: accounts[1],
                value: web3.utils.toWei("1", "ether")
            });
            await campaign.methods.approveRequest().send({
                from: accounts[1]
            });
            await campaign.methods.contribute().send({
                from: accounts[2],
                value: web3.utils.toWei("1", "ether")
            });
            await campaign.methods.contribute().send({
                from: accounts[3],
                value: web3.utils.toWei("1", "ether")
            });

            //manager call finalizeRequest 
            await campaign.methods.finalizeRequest().send({
                from: accounts[0],
            });
        }
        catch(err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);

        //request never complete 
        /* acc 0 สร้างคำสั่ง request ซื้อของจาก acc 1 โดยมี acc 2 เป็นคน approve 
         ครั้งแรก complete = true finalizeRequest อีกครั้ง จะเกิด error จึงนับว่าผ่าน*/
        try {
            await campaign.methods.createRequest('description',1,accounts[1]).send({
                from: accounts[0],
            });       
            await campaign.methods.contribute().send({
                from: accounts[2],
                value: web3.utils.toWei("1", "ether")});
            await campaign.methods.approveRequest(0).send({
                from: accounts[2]
            });        
            await campaign.methods.finalizeRequest(0).send({
                from: accounts[0]
            });        
            await campaign.methods.finalizeRequest(0).send({
                from: accounts[0]
            });        
        } catch (err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);

        //check that the recipient got money
        
        try {
        await campaign.methods.contribute().send({
            from: accounts[0],
            value: web3.utils.toWei("2", "ether")
        });

        const initialBalance = await web3.eth.getBalance(accounts[0]);

        await campaign.methods.finalizeRequest().send({
            from: accounts[0]
        });

        recipient = await campaign.methods.recipient().call()
        assert.strictEqual(accounts[0], recipient)

        const finalBalance = await web3.eth.getBalance(accounts[0]);

        const difference = finalBalance - initialBalance;
        console.log(web3.utils.fromWei('0'+difference, "ether"));
        assert(difference < web3.utils.toWei("1.8", "ether"));
        }
        catch(err) {
            pass = "not ok";
        }
        assert.strictEqual("not ok", pass);
        
    });
    
});