const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether');
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender;
    let realEstate, escrow;
    
    beforeEach( async () => {
        // setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners();

        //deploy Real State contract
        const RealEstate = await ethers.getContractFactory('RealEstate');
        realEstate = await RealEstate.deploy();

        //mint
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
        await transaction.wait();

        // Escrow Contract
        const Escrow = await ethers.getContractFactory('Escrow');
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        );

        transaction = await realEstate.connect(seller).approve(escrow.address, 1);
        await transaction.wait();

        transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5));
        await transaction.wait();
    })
    
    describe('Deployment', () => {

        it('Returns the Nft Address', async () => {
            const result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);
        });

        it('Returns Seller Address', async () => {
            const result = await escrow.seller();
            expect(result).to.be.equal(seller.address);
        });

        it('Returns Inspector Address', async () => {
            const result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        });

        it('Returns Lender Address', async () => {
            const result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        })

    })
    
    describe('Listing', () => {

        it('Updates as Listed', async () => {
            const result = await escrow.isListed(1);
            expect(result).to.be.equal(true);
        });
        
        it('Update Ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
        });

        it('Returns buyer', async () => {
            const result = await escrow.buyer(1);
            expect(result).to.be.equal(buyer.address);
        });

        it('Returns purchase price', async () => {
            const result = await escrow.purchasePrise(1);
            expect(result).to.be.equal(tokens(10));
        });

        it('Returns escrow amount', async () => {
            const result = await escrow.escrowAmount(1);
            expect(result).to.be.equal(tokens(5));
        });
    })


    describe('Deposits', () => {

        it('Updates Escrow Contract balance', async () => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(5));
        });
    })

    describe('Inspection Status', () => {

        it('Updates Inspection Status', async () => {
            let transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        });
    });


    describe('Approve Sale', () => {
        it('Updates Approval Status', async () => {
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();
            let result = await escrow.approval(1, buyer.address);
            expect(result).to.be.equal(true);

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();
            result = await escrow.approval(1, seller.address);
            expect(result).to.be.equal(true);

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();
            result = await escrow.approval(1, lender.address);
            expect(result).to.be.equal(true);
        });
    });


    describe('Finalize Sale', () => {
        beforeEach(async() => {
            let transaction = await escrow.connect(buyer).depositEarnest(1, {value: tokens(5)});
            await transaction.wait();

            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();

            transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            await lender.sendTransaction({to: escrow.address, value: tokens(5)});

            transaction = await escrow.connect(seller).finalizeSale(1);
            await transaction.wait();
        });

        it('updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);            
        });

        it('updates balance', async () => {
            expect(await escrow.getBalance()).to.be.equal(0);            
        });
    });


})