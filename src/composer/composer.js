/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
* @file, definition of the Composer class, which implements the caliper's NBI for hyperledger fabric
*/

'use strict';

var BlockchainInterface = require('../comm/blockchain-interface.js');

// Fabric helpers
var fabric_util      = require('../fabric/util.js');
var fabric_e2e       = require('../fabric/e2eUtils.js');
var fabric_crt_chnl  = require('../fabric/create-channel.js');
var fabric_join_chnl = require('../fabric/join-channel.js');

// Composer helpers
var composer_utils    = require('./composer_utils.js');

class Composer extends BlockchainInterface {
    
    // sets this.configPath
    constructor(config_path) {
        super(config_path);
    };


    init() {
        // initialise the target blockchain, create cards
        var config  = require(this.configPath);
        return this.initialiseFabric()
        .then(() => {
            // Create id cards
            let cards = ['org1', 'org1Admin', 'org2', 'org2Admin'];            
            return composer_utils.createAdminBusNetCards(cards, config.fabric.cryptodir);
        })
        .catch((err) => {
            console.log('composer.init() failed, ' + (err.stack ? err.stack : err));
            return Promise.reject(err);
        });
    };

    initialiseFabric() {
        fabric_util.init(this.configPath);
        fabric_e2e.init(this.configPath);
        return fabric_crt_chnl.run(this.configPath)
        .then(() => {
            return fabric_join_chnl.run(this.configPath);
        })
        .catch((err) => {
            console.log('composer.init() failed at initialiseFabric(), ' + (err.stack ? err.stack : err));
            return Promise.reject(err);
        });
    };

    installSmartContract() {
        console.log('Deploying Composer')
        // Here, this relates to deploying a Composer BusinessNetwork to the Blockchain platform
        // - runtime install on each participating org
        // - start from any participating org
        // - conditionally set log level
        var config = require(this.configPath);
        var chaincodes = config.fabric.chaincodes;
        
        // Expand required deployments
        var busnets =[];
        chaincodes.forEach((busnet) => {
            var orgs = busnet.orgs;
            orgs.forEach((org) => {
                busnets.push({"id": busnet.id, "path": busnet.path, "org": org});
            })
        });

        // install runtime on both orgs using orgOnly card
        return busnets.reduce((promiseChain, busnet) => {
                return promiseChain.then(() => {
                    console.log('installing runtime for ' + busnet.id + ' using card PerfPeerAdmin@' + busnet.org + ' ......');
                    return composer_utils.runtimeInstall(busnet.id, null, 'PerfPeerAdmin@' + busnet.org);
                });
            }, Promise.resolve())  
        .then((result) => {
            // network stark on single peer using orgAdmin card
            return chaincodes.reduce((promiseChain, busnet) => {
                return promiseChain.then(() => {
                    console.log('starting runtime for ' + busnet.id + ' using card PerfPeerAdmin@' + busnet.orgs[0] + 'Admin ......');
                    return composer_utils.networkStart(busnet.path + '/' + busnet.id + '.bna', 'PerfPeerAdmin@' + busnet.orgs[0] + 'Admin', busnet.loglevel);
                });
            }, Promise.resolve()) 
        })
        .catch((err) => {
            console.log('composer.installSmartContract() failed, ' + (err.stack ? err.stack : err));
            return Promise.reject(err);
        });
        
    };

    getContext(name) {
        // Return business network connection
        return composer_utils.getBusNetConnection('PerfNetworkAdmin@' + name);
    }

    releaseContext(context) {
        return Promise.resolve();
    }

    submitTransaction(connection, transaction) {
        let submitTime = process.uptime();
        
        return connection.submitTransaction(transaction)
        .then((complete) => {
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

    getDefaultTxStats(stats, results) {
        var minDelayC2E = 100000, maxDelayC2E = 0, sumDelayC2E = 0; // time from created to endorsed
        var minDelayE2O = 100000, maxDelayE2O = 0, sumDelayE2O = 0; // time from endorsed to ordered
        var minDelayO2V = 100000, maxDelayO2V = 0, sumDelayO2V = 0; // time from ordered to recorded
        var hasValue = true;
        for(let i = 0 ; i < results.length ; i++) {
            let stat = results[i];
            if(!stat.hasOwnProperty('time_endorse')) {
                hasValue = false;
                break;
            }
            if(stat.status === 'success') {
                let delayC2E = stat['time_endorse'] - stat['time_create'];
                let delayE2O = stat['time_order'] - stat['time_endorse'];
                let delayO2V = stat['time_valid'] - stat['time_order'];

                if(delayC2E < minDelayC2E) {
                    minDelayC2E = delayC2E;
                }
                if(delayC2E > maxDelayC2E) {
                    maxDelayC2E = delayC2E;
                }
                sumDelayC2E += delayC2E;

                if(delayE2O < minDelayE2O) {
                    minDelayE2O = delayE2O;
                }
                if(delayE2O > maxDelayE2O) {
                    maxDelayE2O = delayE2O;
                }
                sumDelayE2O += delayE2O;

                if(delayO2V < minDelayO2V) {
                    minDelayO2V = delayO2V;
                }
                if(delayO2V > maxDelayO2V) {
                    maxDelayO2V = delayO2V;
                }
                sumDelayO2V += delayO2V;
            }
        }

        if(hasValue) {
            stats['delayC2E'] = {'min': minDelayC2E, 'max': maxDelayC2E, 'sum': sumDelayC2E};
            stats['delayE2O'] = {'min': minDelayE2O, 'max': maxDelayE2O, 'sum': sumDelayE2O};
            stats['delayO2V'] = {'min': minDelayO2V, 'max': maxDelayO2V, 'sum': sumDelayO2V};
        }
    }
}

module.exports = Composer;