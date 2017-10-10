/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict';

const Admin = require('composer-admin');
const BusinessNetworkDefinition = Admin.BusinessNetworkDefinition;

const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;

const IdCard = require('composer-common').IdCard;

const fs = require('fs');
const os = require('os');
var path = require('path');

// Exports
module.exports.runtimeInstall = runtimeInstall;
module.exports.networkStart = networkStart;
module.exports.getBusNetConnection = getBusNetConnection;
module.exports.createAdminBusNetCards = createAdminBusNetCards;

// Pass a string array of profile names ['', '', '']
// return an array of card objects
function createAdminBusNetCards(cardNames, cryptodir) {    
    
    let adminConnection = new Admin.AdminConnection();

    return cardNames.reduce((promiseChain, card) => {
        return promiseChain.then(() => {
            console.log('Creating Admin Business Network Card for: ' + card);
            let profile = createAdminProfile(card, cryptodir);

            // set if the options have been given into the metadata
            let metadata = {
                version: 1,
                userName : `${card}@${profile.type}`,
                roles : 'PeerAdmin',
            };

            // base card
            let idCard = new IdCard(metadata, profile);

            // certificates & privateKey
            let cert = fs.readFileSync(profile.userCert).toString();
            let key = fs.readFileSync(profile.userKey).toString();

            const newCredentials = {};
            newCredentials.certificate = cert;
            newCredentials.privateKey =  key;

            idCard.setCredentials(newCredentials);
            let cardName = `PerfPeerAdmin@${card}`;

            return cardExists(adminConnection, cardName)
            .then((exists) => {
                if(!exists) {                    
                    return adminConnection.importCard(cardName, idCard);
                } else {
                    console.log('Skipping import of existing card: ', cardName);
                    return Promise.resolve();
                }
            });
        });
    }, Promise.resolve());
}


function cardExists(adminConnection, cardName) {
    return adminConnection.cardStore.get(cardName)
    .then((card) => {
        return Promise.resolve(true);
    })
    .catch((err) => {
        return Promise.resolve(false);
    });
}

function createAdminProfile(profileId, cryptodir) {
    let profile = {};    
    let ca = {};
    let peer1 = {};
    let peer2 = {};
    let peer3 = {};
    let peer4 = {};
    profile.type = 'hlfv1';
    profile.channel = 'mychannel';
    profile.timeout = '1200';

    let orderer = {};
    orderer.url = 'grpcs://localhost:7050';
    orderer.hostnameOverride = 'orderer.example.com';
    orderer.cert = __dirname + '/../../' + cryptodir + '/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt';
    profile.orderers = [orderer];

    switch(profileId) {
        case 'org1':
            profile.name = 'org1-only';

            ca.url = 'https://localhost:7054';
            ca.name = 'ca-org1';
            profile.ca = ca;

            peer1.requestURL = 'grpcs://localhost:7051';
            peer1.eventURL = 'grpcs://localhost:7053';
            peer1.hostnameOverride = 'peer0.org1.example.com';
            peer1.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt');
            
            peer2.requestURL = 'grpcs://localhost:7057';
            peer2.eventURL = 'grpcs://localhost:7059';
            peer2.hostnameOverride = 'peer1.org1.example.com';
            peer2.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt');
            
            profile.peers = [peer1, peer2];

            profile.mspID = 'Org1MSP';

            profile.userId = 'org1Admin'
            profile.userCert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/users/Admin\@org1.example.com/msp/signcerts/Admin\@org1.example.com-cert.pem');
            profile.userKey  = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/users/Admin\@org1.example.com/msp/keystore/0d2b2fc385b10fa59003217e1bb5af2d24a3d762266e287867a1bc290eb44657_sk');
            
            break;
        case 'org1Admin':
            profile.name = 'org1';

            ca.url = 'https://localhost:7054';
            ca.name = 'ca-org1';
            profile.ca = ca;

            peer1.requestURL = 'grpcs://localhost:7051';
            peer1.eventURL = 'grpcs://localhost:7053';
            peer1.hostnameOverride = 'peer0.org1.example.com';
            peer1.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt');
            
            peer2.requestURL = 'grpcs://localhost:7057';
            peer2.eventURL = 'grpcs://localhost:7059';
            peer2.hostnameOverride = 'peer1.org1.example.com';
            peer2.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt');
           
            peer3.requestURL = 'grpcs://localhost:8051';
            peer3.hostnameOverride = 'peer0.org2.example.com';
            peer3.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt');
            
            peer4.requestURL = 'grpcs://localhost:8057';
            peer4.hostnameOverride = 'peer1.org2.example.com';
            peer4.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt');
            
            profile.peers = [peer1, peer2, peer3, peer4];

            profile.mspID = 'Org1MSP';   
            
            profile.userId = 'org1Admin'
            profile.userCert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/users/Admin\@org1.example.com/msp/signcerts/Admin\@org1.example.com-cert.pem');
            profile.userKey  = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/users/Admin\@org1.example.com/msp/keystore/0d2b2fc385b10fa59003217e1bb5af2d24a3d762266e287867a1bc290eb44657_sk');
            
            break;
        case 'org2':
            profile.name = 'org2-only';

            ca.url = 'https://localhost:8054';
            ca.name = 'ca-org2';
            profile.ca = ca;
            
            peer1.requestURL = 'grpcs://localhost:8051';
            peer1.eventURL = 'grpcs://localhost:8053';
            peer1.hostnameOverride = 'peer0.org2.example.com';
            peer1.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt');
            
            peer2.requestURL = 'grpcs://localhost:8057';
            peer2.eventURL = 'grpcs://localhost:8059';
            peer2.hostnameOverride = 'peer1.org2.example.com';
            peer2.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt');
            
            profile.peers = [peer1, peer2];

            profile.mspID = 'Org2MSP';
              
            profile.userId = 'org2Admin'
            profile.userCert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/users/Admin\@org2.example.com/msp/signcerts/Admin\@org2.example.com-cert.pem');
            profile.userKey  = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/users/Admin\@org2.example.com/msp/keystore/febc59257fd86c4e1020727d6915f6af9c5b698abdb1133cc7b2c8105961d96d_sk');

            break;
        case 'org2Admin':
            profile.name = 'org2';

            ca.url = 'https://localhost:8054';
            ca.name = 'ca-org2';
            profile.ca = ca;
            
            peer1.requestURL = 'grpcs://localhost:8051';
            peer1.eventURL = 'grpcs://localhost:8053';
            peer1.hostnameOverride = 'peer0.org2.example.com';
            peer1.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt');
            
            peer2.requestURL = 'grpcs://localhost:8057';
            peer2.eventURL = 'grpcs://localhost:8059';
            peer2.hostnameOverride = 'peer1.org2.example.com';
            peer2.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt');
           
            peer3.requestURL = 'grpcs://localhost:7051';
            peer3.hostnameOverride = 'peer0.org1.example.com';
            peer3.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt');
            
            peer4.requestURL = 'grpcs://localhost:7057';
            peer4.hostnameOverride = 'peer1.org1.example.com';
            peer4.cert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt');
          
            profile.peers = [peer1, peer2, peer3, peer4];

            profile.mspID = 'Org2MSP';

            profile.userId = 'org2Admin'
            profile.userCert = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/users/Admin\@org2.example.com/msp/signcerts/Admin\@org2.example.com-cert.pem');
            profile.userKey  = path.join(__dirname, '/../../', cryptodir, '/peerOrganizations/org2.example.com/users/Admin\@org2.example.com/msp/keystore/febc59257fd86c4e1020727d6915f6af9c5b698abdb1133cc7b2c8105961d96d_sk');

            break;
        default:
            throw new Error('Composer connection profile creation attempted for unknown profileId ' + profileId);
    
    }  
    return profile;
}

function runtimeInstall(businessNetworkName, installOptions, cardName) {
    // returns a Promise
    let adminConnection = new Admin.AdminConnection();
    
    return adminConnection.connect(cardName)
    .then((result) => {
        return adminConnection.install(businessNetworkName, installOptions);
    })
    .catch((error) => {
        console.log('composer.runtimeInstall() failed, ' + (error.stack ? error.stack : error));
        return Promise.reject(error);
    })   
};

function networkStart(archiveFile, cardName, logLevel) {
    let archiveFileContents;
    let businessNetworkDefinition;
    let card;
    let idCardName;

    //check the file is there
    let filePath = path.join(__dirname, '..', archiveFile);
    if (fs.existsSync(filePath)) {
        archiveFileContents = fs.readFileSync(filePath);        
    } else {
        throw new Error('Archive file ' + filePath + ' does not exist.');
    }

    // connect and start
    let adminConnection = new Admin.AdminConnection();
    return BusinessNetworkDefinition.fromArchive(archiveFileContents)
    .then((definition) => {
        businessNetworkDefinition = definition;
        return adminConnection.connect(cardName);              
    })
    .then(() => {
        return adminConnection.exportCard(cardName);
    })
    .then((card) => {
        // create the NetworkAdmin card for the new network and import it
        let metadata= {
            version : 1,
            userName : 'admin',
            enrollmentSecret : 'adminpw',
            businessNetwork : businessNetworkDefinition.getName()
        };

        let idCard = new IdCard(metadata, card.getConnectionProfile());
        idCardName = `PerfNetworkAdmin@${businessNetworkDefinition.getName()}`;
        return cardExists(adminConnection, idCardName)
        .then((exists) => {
            if(!exists) {           
                return adminConnection.importCard(idCardName, idCard)
                .then(() => {
                    return Promise.resolve(card);
                });
            } else {
                return Promise.resolve(card);
            }
        });
    })
    .then((card) => {
        let startOptions = {};
        if(logLevel) {
            startOptions.logLevel = logLevel;
        }
        startOptions.card = card;
        startOptions.bootstrapTransactions = buildBootstrapTransactions(businessNetworkDefinition);

        console.log('Performing network start');
        return adminConnection.start(businessNetworkDefinition, startOptions);
    })
    .then(() => {
        return getBusNetConnection(idCardName)
        .then((businessNetworkConnection) => {
            console.log('Performing network ping to confirm identity activation');
            return businessNetworkConnection.ping();
        })
    })
    .catch((error) => {
        console.log('composer.networkStart() failed, ' + error);
        return Promise.reject(error);
    }) 
};

function getBusNetConnection(cardName) {
    let busNetConnection = new BusinessNetworkConnection();
    return busNetConnection.connect(cardName)
    .then((definition) => {
        return busNetConnection;
    })
    .catch((error) => {
        console.log('composer.getBusNetConnection() failed, ' + (error.stack ? error.stack : error));
        return Promise.reject(error);
    })
};

function buildBootstrapTransactions(businessNetworkDefinitinon) {

    // Grab the useful things from the business network definition.
    const factory = businessNetworkDefinitinon.getFactory();
    const serializer = businessNetworkDefinitinon.getSerializer();

    // Parse the network administrators.
    const secret = 'adminpw';
    const networkAdmins = [{name: 'admin', secret}];

    // Convert the network administrators into add participant transactions.
    const addParticipantTransactions = networkAdmins.map((networkAdmin) => {
        const participant = factory.newResource('org.hyperledger.composer.system', 'NetworkAdmin', networkAdmin.name);
        const targetRegistry = factory.newRelationship('org.hyperledger.composer.system', 'ParticipantRegistry', participant.getFullyQualifiedType());
        const addParticipantTransaction = factory.newTransaction('org.hyperledger.composer.system', 'AddParticipant');
        Object.assign(addParticipantTransaction, {
            resources: [ participant ],
            targetRegistry
        });
        return addParticipantTransaction;
    });

    // Convert the network administrators into issue or bind identity transactions.
    const identityTransactions = networkAdmins.map((networkAdmin) => {

        // Handle a certificate which requires a bind identity transaction.
        let identityTransaction;
        if (networkAdmin.certificate) {
            identityTransaction = factory.newTransaction('org.hyperledger.composer.system', 'BindIdentity');
            Object.assign(identityTransaction, {
                participant: factory.newRelationship('org.hyperledger.composer.system', 'NetworkAdmin', networkAdmin.name),
                certificate: networkAdmin.certificate
            });
        }

        // Handle an enrollment secret which requires an issue identity transactiom.
        if (networkAdmin.secret) {
            identityTransaction = factory.newTransaction('org.hyperledger.composer.system', 'IssueIdentity');
            Object.assign(identityTransaction, {
                participant: factory.newRelationship('org.hyperledger.composer.system', 'NetworkAdmin', networkAdmin.name),
                identityName: networkAdmin.name
            });
        }
        return identityTransaction;

    });

    // Serialize all of the transactions into a single array.
    const transactions = addParticipantTransactions.concat(identityTransactions);
    const json = transactions.map((transaction) => {
        return serializer.toJSON(transaction);
    });

    return json;
}