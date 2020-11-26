pragma solidity >=0.6.6 < 0.8.0;
contract CampaignFactory {
    Campaign[] public deployedCampaigns;

    function createCampaign(uint minimum) public {
        Campaign newCampaign = new Campaign(minimum, msg.sender);
        deployedCampaigns.push(newCampaign);
    }

    function getDeployedCampaigns() public view returns (Campaign[] memory) {
        return deployedCampaigns;
    }
}
contract Campaign {

    //variables
    address public manager; //address คนสร้าง campaign
    uint public minimumContribution; //จำนวนเงิน donation ต่ำสุดที่จะมาเป็น contributor หรือ approver
    //address[] public approvers;
    mapping (address => bool) public approvers; //list address ของ approver
    Request[] public requests; //list requst that manager has create
    uint approversCount; //จำนวนคนที่เป็นผู้ร่วมลงทุน

    struct Request {
        string description; //จะ request อะไร
        uint amount; //เงินเท่าไร
        address recipient; //address คนที่จะโอนเงินไปให้
        bool complete; //request นี่จบหรือยัง
        uint approvalCount; //จำนวนคนที่โหวต
        mapping(address => bool) approvals; //ใครโหวตบ้าง
        
    } 
    modifier restricted() {
        require(msg.sender == manager);
        _;
    }
    
    //constructor (uint minimum) public {
    constructor (uint minimum, address creator) public payable{
        //manager = msg.sender;
        manager = creator;
        minimumContribution = minimum;
    }
    
    
    function contribute() public payable {
        require(msg.value > minimumContribution);
        //approvers.push(msg.sender);
        approvers[msg.sender] = true;
        approversCount++;
        
    }

    //manager เท่านั้นที่ create ได้
    function createRequest(string memory description, uint amount, address recipient) public restricted {
       
        Request memory newRequest = Request({
        //Request storage newRequest = Request({
            description: description,
            amount: amount,
           recipient: recipient,
           complete: false,
           approvalCount: 0 
           //we do not need to initilize mapping
           
        });

        requests.push(newRequest);
    }
    /* 
    คน request เป็น approvers คนร่วมลงทุน
    และ ไม่เคย approvals (คนโหวต) มาก่อน
    */
    function approveRequest(uint index) public {
        Request storage request = requests[index];

        require(approvers[msg.sender]);
        require(!request.approvals[msg.sender]);

        request.approvals[msg.sender] = true;
        request.approvalCount++;
    }

    /*
    manager เท่านั้นที่ finalizeRequest ได้
    ต้องมีจำนวนคนโหวต > จำนวนคนที่เป็น approvers คนร่วมลงทุน /2
    request นี้ต้องไม่เคย complete
    โอนเงินตาม amount
    ให้ complete = true
    */
    function finalizeRequest(uint index) public payable restricted {
        Request storage request = requests[index];

        require(request.approvalCount > (approversCount / 2));
        require(!request.complete);
        address payable rec = payable (request.recipient);

        //request.recipient.transfer(request.amount);
        rec.transfer(request.amount);
        request.complete = true;
    }
}

