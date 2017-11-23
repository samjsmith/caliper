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

module.exports.info  = "DTC Performance Test";

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
var factory;

const namespace = 'com.dtc';

module.exports.init = function(blockchain, context, args) {
    // Create Participants and Assets to use in main test    
    bc = blockchain;
    busNetConnection = context;
    testAssetNum = args.testAssets;
    factory = busNetConnection.getBusinessNetwork().getFactory();
   
    return busNetConnection.getParticipantRegistry(namespace + '.bankEmployeeParticipant')
    .then((participantRegistry) => {
        let bank0 = factory.newResource(namespace, 'bankEmployeeParticipant', 'BANK_0');
        let bank1 = factory.newResource(namespace, 'bankEmployeeParticipant', 'BANK_1');
        let bank2 = factory.newResource(namespace, 'bankEmployeeParticipant', 'BANK_2');
        let bank3 = factory.newResource(namespace, 'bankEmployeeParticipant', 'BANK_3');
        let bank4 = factory.newResource(namespace, 'bankEmployeeParticipant', 'BANK_4');
        return participantRegistry.addAll([bank0, bank1, bank2, bank3, bank4]);
    })
    .then(() => {
        return busNetConnection.getAssetRegistry(namespace + '.trade')
    })
    .then((assetRegistry) => {
        // try not to kill fabric by creating too many assets at the same time
        var max = 25;
        var quotient = Math.floor(testAssetNum/max);
        var remainder = testAssetNum % max;

        var batches = Array(quotient).fill(max);
        batches.push(remainder);

        return batches.reduce(function(promiseChain, batchSize) {
            return promiseChain.then( () => {
                var assets   = Array();        
                for (let i=0; i<batchSize; i++){
                    assetId++;
                    let trade = factory.newResource(namespace, 'trade', assetId.toString());
                    trade.buyersBank = factory.newRelationship(namespace, 'bankEmployeeParticipant', 'BANK_0');
                    trade.sellersBank = factory.newRelationship(namespace, 'bankEmployeeParticipant', 'BANK_1');
                    trade.purchaseOrderId = assetId.toString();
                    trade.buyer = 'Simon';                    
                    trade.seller = 'Nick';
                    trade.totalPrice = 100000;
                    trade.totalPriceTolerance = 0;
                    trade.currency = 'Hungarian Florens';
                    trade.expiryDate = new Date();
                    let tradeState = factory.newConcept(namespace, 'transactionState');
                    tradeState.state = "much state";                    
                    trade.tradeStates = [tradeState];

                    let shipmentState = factory.newConcept(namespace, 'transactionState');
                    shipmentState.state = "much state";                    
                    trade.shipmentStates = [shipmentState];

                    let invoiceState = factory.newConcept(namespace, 'transactionState');
                    invoiceState.state = "much state";                    
                    trade.invoiceStates = [invoiceState];

                    trade.incoterms = "such terms";

                    let terms = factory.newConcept(namespace, 'paymentTerms');
                    terms.numberOfDays = 100;
                    terms.requiredSettlementCondition = "satisfactory";    
                    trade.paymentTerms = terms;     

                    if (assetId%5 == 0) {
                        trade.currentTradePhase = 'OPEN';
                    } else {
                        trade.currentTradePhase = 'CLOSED';
                    } 

                    assets.push(trade);            
                }
                if(assets.length > 0) {
                    console.log('Adding ' + assets.length + ' Assets......');
                    return assetRegistry.addAll(assets);
                } else{
                    return Promise.resolve();
                } 
            });
        }, Promise.resolve())
               
    })
    .then((resp) => {
        console.log('Asset addition complete');
        // Add a query
        myQuery = busNetConnection.buildQuery('SELECT com.dtc.trade WHERE ((seller == \'Nick\' OR buyer == \'Simon\') AND (currentTradePhase != \'CLOSED\'))');        
    })
    .catch(function (err) {
      console.log('error in test init: ', err);
      throw(err);
    }); 
}

module.exports.run = function() {
    // Go for a query of an asset
    let submitTime = process.uptime();
    let id = 1;

    return busNetConnection.query(myQuery)
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
        return invoke_status;
    })
    .catch((err) => {
        console.log('error in test run: ', err);
        throw(err);
    });    
}

module.exports.end = function(results) {
    return Promise.resolve(true);
};