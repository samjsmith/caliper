/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/

'use strict'

module.exports.info  = "basic sample network of basics";

const Runtime = require('composer-runtime');
const Common = require('composer-common');
const Client = require('composer-client');
const BusinessNetworkConnection = Client.BusinessNetworkConnection;

// 
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
    })
    .catch(function (err) {
      console.log('error in test init: ', err);
      return Promise.reject(err);
    }); 
}

module.exports.run = function() {
    // Go for a query of an asset
    let submitTime = process.uptime();
    let id = assetId--;
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
    return Promise.resolve(true);
};