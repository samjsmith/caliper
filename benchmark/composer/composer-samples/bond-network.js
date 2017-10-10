/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*  Bond Network
*  Issues/Pubishes Bonds from an 'issuer' through a Transaction
*  - Example test round
*      {
*        "cmd" : "bond-network",
*        "txNumbAndTps" : [[10,20]],
*        "callback" : "benchmark/composer/composer-samples/bond-network.js"
*      }
*  - Init:
*    - Creates a single Participant (Issuer)
*  - Run: 
*    - Defines and publishes a bond linked to the issuer.
*
*/

'use strict'

module.exports.info  = "Bond Network Performance Test";

var bc;
var busNetConnection;
var factory;
var assetId = 0;
const namespace = 'org.acme.bond';

module.exports.init = function(blockchain, context, args) {
    // Create Participants to use in main test    
    bc = blockchain;
    busNetConnection = context;
    factory = busNetConnection.getBusinessNetwork().getFactory();
   
    return busNetConnection.getParticipantRegistry(namespace + '.Issuer')
    .then((participantRegistry) => {
        let participant = factory.newResource(namespace, 'Issuer', 'ISSUER_0');
        participant.name = 'penguin';
        return participantRegistry.add(participant);
    })
    .catch(function (err) {
      console.log('error in test init: ', err);
      return Promise.reject(err);
    }); 
}

module.exports.run = function() {
    let transaction = factory.newTransaction(namespace, 'PublishBond');
    transaction.ISINCode = 'ISIN_' + assetId++;
    let bond = factory.newConcept(namespace, 'Bond');
    bond.instrumentId = [];
    bond.exchangeId = [];
    bond.maturity = new Date();
    bond.parValue = 0;
    bond.faceAmount = 0;
    bond.dayCountFraction = '';
    let paymentFrequency = factory.newConcept(namespace, 'PaymentFrequency');
    paymentFrequency.periodMultiplier = 0;
    paymentFrequency.period = 'DAY';
    bond.paymentFrequency = paymentFrequency;
    bond.issuer = factory.newRelationship(namespace, 'Issuer', 'ISSUER_0');      
    transaction.bond = bond;    
    
    return bc.bcObj.submitTransaction(busNetConnection, transaction);
}

module.exports.end = function(results) {
    return Promise.resolve(true);
};