/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*  Basic Sample Network
*  Updates the value of an Asset through a Transaction.
*  - Example test round (txn <= testAssets)
*      {
*        "cmd" : "basic-sample-network",
*        "txNumbAndTps" : [[10,20]],
*        "arguments": {"testAssets": 10},
*        "callback" : "benchmark/composer/composer-samples/basic-sample-network.js"
*      }
*  - Init: 
*    - Single Participant created (PARTICIPANT_0)
*    - Test specified number of Assets created, belonging to a PARTICIPANT_0
*  - Run:
*    - Transactions run against all created assets to update their values
*
*/

'use strict'

module.exports.info  = "Basic Sample Network Performance Test";

var bc;
var busNetConnection;
var testAssetNum;
var factory;
const namespace = 'org.acme.sample';

module.exports.init = function(blockchain, context, args) {
    // Create Participants and Assets to use in main test    
    bc = blockchain;
    busNetConnection = context;
    testAssetNum = args.testAssets;
    factory = busNetConnection.getBusinessNetwork().getFactory();
   
    return busNetConnection.getParticipantRegistry(namespace + '.SampleParticipant')
    .then((participantRegistry) => {
        let participant = factory.newResource(namespace, 'SampleParticipant', 'PARTICIPANT_0');
        participant.firstName = 'penguin';
        participant.lastName = 'wombat';
        return participantRegistry.add(participant);
    })
    .then(() => {
        return busNetConnection.getAssetRegistry(namespace + '.SampleAsset')
    })
    .then((assetRegistry) => {
        var assets = Array();        
        for (let i=0; i<testAssetNum; i++){
            let asset = factory.newResource(namespace, 'SampleAsset', 'ASSET_' + i);
            asset.owner = factory.newRelationship(namespace, 'SampleParticipant', 'PARTICIPANT_0');
            asset.value = 'priceless';            
            assets.push(asset);            
        }
        console.log('Adding ' + assets.length + ' Assets......');
        return assetRegistry.addAll(assets);        
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
    let transaction = factory.newTransaction(namespace, 'SampleTransaction');
    transaction.newValue = 'worthless';
    transaction.asset = factory.newRelationship(namespace, 'SampleAsset', 'ASSET_' + --testAssetNum);
    
    return bc.bcObj.submitTransaction(busNetConnection, transaction);
}

module.exports.end = function(results) {
    return Promise.resolve(true);
};