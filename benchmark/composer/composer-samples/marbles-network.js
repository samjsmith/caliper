/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*  Marbles Network
*  Trades Marbles between two players through a Transaction
*  - Example test round
*      {
*        "cmd" : "marbles-network",
*        "txNumbAndTps" : [[10,20]],
*        "arguments": {"testAssets": 10},
*        "callback" : "benchmark/composer/composer-samples/marbles-network.js"
*      }
*  - Init:
*    - Creates 2 Particpants
*    - Test specified number of Assets(Marbles) created, belonging to Participant1
*  - Run:
*   -  All Marbles traded to Participant2 through test
*
*/

'use strict'

module.exports.info  = "Marbles Network Performance Test";
 
var bc;
var busNetConnection;
var testAssetNum;
var factory;

const namespace = 'org.hyperledger_composer.marbles';

module.exports.init = function(blockchain, context, args) {
    // Create Participants and Assets to use in main test    
    bc = blockchain;
    busNetConnection = context;
    testAssetNum = args.testAssets;
    factory = busNetConnection.getBusinessNetwork().getFactory();
   
    return busNetConnection.getParticipantRegistry(namespace + '.Player')
    .then((participantRegistry) => {
        let players = new Array();
        for (let i=0; i<2; i++) {
            let player = factory.newResource(namespace, 'Player', 'PLAYER_' + i);
            player.firstName = 'penguin';
            player.lastName = 'wombat';
            players.push(player);
        }
        return participantRegistry.addAll(players);
    })
    .then(() => {
        return busNetConnection.getAssetRegistry(namespace + '.Marble')
    })
    .then((assetRegistry) => {
        var marbles = Array();        
        for (let i=0; i<testAssetNum; i++) {
            let marble = factory.newResource(namespace, 'Marble', 'MARBLE_' + i);
            marble.size = 'SMALL';
            marble.color = 'RED';
            marble.owner = factory.newRelationship(namespace, 'Player', 'PLAYER_0'); 
            marbles.push(marble);            
        }
        console.log('Adding ' + marbles.length + ' Assets......');
        return assetRegistry.addAll(marbles);        
    })
    .then((resp) => {
        console.log('Asset addition complete');
        return Promise.resolve();
    })
    .catch(function (err) {
      console.log('error in test init: ', err);
      return Promise.reject(err);
    }); 
}

module.exports.run = function() {
    let transaction = factory.newTransaction(namespace, 'TradeMarble');
    transaction.marble = factory.newRelationship(namespace, 'Marble', 'MARBLE_' + --testAssetNum); 
    transaction.newOwner = factory.newRelationship(namespace, 'Player', 'PLAYER_1'); 
    return bc.bcObj.submitTransaction(busNetConnection, transaction);
}

module.exports.end = function(results) {
    return Promise.resolve(true);
};