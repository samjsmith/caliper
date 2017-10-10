/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*  Query of Asset
*  Queries for a specific Asset using a pre-defined query, built from basic-sample-network
*  - Example test round (txn <= testAssets)
*      {
*        "cmd" : "basic-sample-network",
*        "txNumbAndTps" : [[10,20]],
*        "arguments": {"testAssets": 10},
*        "callback" : "benchmark/composer/composer-micro/query-asset.js"
*      }
*  - Init: 
*    - Single Participant created (PARTICIPANT_0)
*    - Test specified number of Assets created, belonging to a PARTICIPANT_0
*  - Run:
*    - Transactions run against all created assets to query for one of the created assets
*
*  - AppMetrics:
*    - Appmetrics is configured and can be observed on port 3001 post test init
*
*/

'use strict'
var appmetrics = require('appmetrics');
var dash = require('appmetrics-dash').monitor({appmetrics: appmetrics});

module.exports.info  = "Query Asset Performance Test";

var bc;
var busNetConnection;
var participantRegistry, assetRegistry;

var participants = [];
var participantArray = [
    '{"$class": "org.acme.sample.SampleParticipant","participantId": "theBob","firstName": "bob","lastName": "bobz"}',
    '{"$class": "org.acme.sample.SampleParticipant","participantId": "theSal","firstName": "sal","lastName": "salz"}'
];

var testAssetNum;
var assetId = 0;
var assetValue = 1000;

var myQuery;
var serializer;

module.exports.init = function(blockchain, context, args) {
    // Create Participants and Assets to use in main test    
    bc = blockchain;
    busNetConnection = context;
    testAssetNum = args.testAssets;
    serializer = busNetConnection.getBusinessNetwork().getSerializer();
   
    return busNetConnection.getParticipantRegistry('org.acme.sample.SampleParticipant')
    .then((participantRegistry) => {
        participantArray.forEach((participant) => {
            let json = JSON.parse(participant);            
            let resource = serializer.fromJSON(json);
            resource.validate();
            participants.push(resource);
        });
        console.log('Adding ' + participants.length + ' Participants......');
        return participantRegistry.addAll(participants);
    })
    .then(() => {
        return busNetConnection.getAssetRegistry('org.acme.sample.SampleAsset');
    })
    .then((assetRegistry) => {
        // try not to kill fabric by creating too many assets at the same time
        var max = 1000;
        var quotient = Math.floor(testAssetNum/max);
        var remainder = testAssetNum % max;

        var batches = Array(quotient).fill(max);
        batches.push(remainder);

        return batches.reduce(function(promiseChain, batchSize) {
            return promiseChain.then( () => {
                var assets   = Array();        
                for (let i=0; i<batchSize; i++){
                    assetId++;
                    let testAsset = '{"$class": "org.acme.sample.SampleAsset","assetId":"' + assetId + '","owner": "resource:org.acme.sample.SampleParticipant#theBob","value": "' + assetValue + '"}';
                    let json = JSON.parse(testAsset);            
                    let resource = serializer.fromJSON(json);
                    resource.validate();
                    assets.push(resource);            
                }
                console.log('Adding ' + assets.length + ' Assets......');
                return assetRegistry.addAll(assets)
                .then(() => {
                    return new Promise(resolve => setTimeout(resolve, 50000));
                })
            });
        }, Promise.resolve())
               
    })
    .then((resp) => {
        console.log('Asset addition complete');
        return Promise.resolve();
    })
    .then((resp) => {
        // Add a query
        myQuery = busNetConnection.buildQuery('SELECT org.acme.sample.SampleAsset WHERE (assetId == _$inputValue)');

        // Enable appmetrics monitoring
        // creates a new server for the dashboard on port 3001 by default http://localhost:3001/appmetrics-dash
        appmetrics.enable('profiling'); 

        return Promise.resolve();
    })
    .catch(function (err) {
      console.log('error in test init: ', err);
      return Promise.reject(err);
    }); 
}

module.exports.run = function() {
    // Go for a query of an asset
    let submitTime = process.uptime();
    let id = 1;
    return busNetConnection.query(myQuery, { inputValue: id.toString()})
    .then((result) => {
        var invoke_status = {
            id           : 3341,
            status       : 'created',
            time_create  : submitTime,
            time_valid   : 0,
            time_endorse : 0,
            time_order   : 0,
            result       : null
        };
    
        invoke_status.status = 'success';
        invoke_status.time_valid = process.uptime();
        return Promise.resolve(invoke_status);
    })
    .catch((err) => {
        console.log('error in test run: ', err);
        return Promise.reject(err);
    });    
}

module.exports.end = function(results) {
    // Disable appmetrics monitoring
    appmetrics.disable('profiling'); 
    return Promise.resolve(true);
};