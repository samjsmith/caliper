/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*/


'use strict'

var path = require('path');
var config_path;
if(process.argv.length < 3) {
    config_path = path.join(__dirname, 'config-composer.json');
}
else {
    config_path = path.join(__dirname, process.argv[2]);
}

// use default framework to run the tests
var framework = require('../../src/comm/bench-flow.js');
console.log('Using Config Path: ', config_path);
framework.run(config_path);