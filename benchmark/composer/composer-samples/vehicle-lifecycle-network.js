/**
* Copyright 2017 IBM. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
*  Vehicle Lifecycle Network
*  Moves Vehicles through a lifecycle via Transaction(s)
*  - Example test round(s)
*      {
*        "cmd" : "vehicle-lifecycle-network",
*        "txNumbAndTps" : [[50,1]],
*        "arguments": {"testAssets": 50, "transaction": "placeOrder"},
*        "callback" : "benchmark/composer/composer-samples/vehicle-lifecycle-network.js"
*      }
*      {
*        "cmd" : "vehicle-lifecycle-network",
*        "txNumbAndTps" : [[50,1]],
*        "arguments": {"testAssets": 50, "transaction": "updateOrder"},
*        "callback" : "benchmark/composer/composer-samples/vehicle-lifecycle-network.js"
*      }
*      {
*        "cmd" : "vehicle-lifecycle-network",
*        "txNumbAndTps" : [[50,1]],
*        "arguments": {"testAssets": 50, "transaction": "scrapVehicle"},
*        "callback" : "benchmark/composer/composer-samples/vehicle-lifecycle-network.js"
*      }
*  - Supported Transactions:
*    - placeOrder
*    - updateOrder
*    - scrapVehicle
*  - Init: 
*    - Varies based on Transaction called
*  - Run:
*    - Specified Transaction runs
*
*/

module.exports.info  = "Vehicle Lifecycle Network Performance Test";

var bc;
var busNetConnection;
var testAssetNum;
var testTransaction;
var factory;

var assetId = 0;
const base_ns = 'org.acme.vehicle.lifecycle';
const manuf_ns = 'org.acme.vehicle.lifecycle.manufacturer';
const vda_ns = 'org.vda';

module.exports.init = function(blockchain, context, args) {
  // Create Participants and Assets to use in main test    
  bc = blockchain;
  busNetConnection = context;
  testAssetNum = args.testAssets;
  testTransaction = args.transaction;

  factory = busNetConnection.getBusinessNetwork().getFactory();

  let manufacturers = new Array();
  let privateOwners = new Array();
  let orders = new Array();
  let vehicles = new Array();

  switch(testTransaction) {
      case 'placeOrder':
        // Require Manufacturer and number of Person(s) to order a vehicle from the company
        // - Single Manufacturer
        manufacturers.push(factory.newResource(manuf_ns, 'Manufacturer', 'MANUFACTURER_1'));
        // - Test specified number of 'Person(s)'
        for(let i = 0; i < testAssetNum; i ++){
          privateOwners.push(factory.newResource(base_ns, 'PrivateOwner', 'PRIVATEOWNER_' + i));
        }
        break;
      case 'updateOrderStatus':
        // Require Manufacturer, number of Person(s), and a number of Order(s)
        // - Single Manufacturer
        manufacturers.push(factory.newResource(manuf_ns, 'Manufacturer', 'MANUFACTURER_1'));
        // - Test specified number of 'Person(s)'
        for(let i = 0; i < testAssetNum; i ++){
          privateOwners.push(factory.newResource(base_ns, 'PrivateOwner', 'PRIVATEOWNER_' + i));
        }
        // - Test specified number of 'Orders'
        for(let i = 0; i < testAssetNum; i ++){
          let order = factory.newResource(manuf_ns, 'Order', 'ORDER_' + i);
          order.orderStatus = 'PLACED';
          order.manufacturer = factory.newRelationship(manuf_ns, 'Manufacturer', 'MANUFACTURER_1');
          order.orderer = factory.newRelationship(base_ns, 'PrivateOwner', 'PRIVATEOWNER_' + i);
          let vehicle = factory.newConcept(vda_ns, 'VehicleDetails');
          vehicle.make = 'testMake';
          vehicle.modelType = 'testModel';
          vehicle.colour = 'testColour';
          order.vehicleDetails = vehicle;
          orders.push(order);
        }
        break;
      case 'scrapVehicle':
        // Require Vehicles to scrap
        for(let i = 0; i < testAssetNum; i ++){
          let vehicle = factory.newResource(vda_ns, 'Vehicle', 'VEHICLE_' + i);
          let details = factory.newConcept(vda_ns, 'VehicleDetails');
          details.make = 'testMake';
          details.modelType = 'testModel';
          details.colour = 'testColour';
          vehicle.vehicleDetails = details;
          vehicle.vehicleStatus = 'OFF_THE_ROAD';
          vehicles.push(vehicle);
        }
        break;
      default:
          throw new Error('No valid test Transaction specified');
  }

  return busNetConnection.getParticipantRegistry(manuf_ns + '.Manufacturer')
  .then(function(manufacturerRegistry) {
      return manufacturerRegistry.addAll(manufacturers);
  })
  .then(function() {
      return busNetConnection.getParticipantRegistry(base_ns + '.PrivateOwner');
  })
  .then(function(ownerRegistry) {      
      return ownerRegistry.addAll(privateOwners);
  })
  .then(function() {
    return busNetConnection.getAssetRegistry(manuf_ns + '.Order');
  })
  .then(function(orderRegistry) {      
      return orderRegistry.addAll(orders);
  })
  .then(function() {
    return busNetConnection.getAssetRegistry(vda_ns + '.Vehicle');
  })
  .then(function(vehicleRegistry) {      
      return vehicleRegistry.addAll(vehicles);
  })
  .then((resp) => {
      console.log('Test init() complete');
      return Promise.resolve();
  })
  .catch(function (err) {
    console.log('error in test init(): ', err);
    return Promise.reject(err);
  }); 
}

module.exports.run = function() {
  let transaction;
  let serializer = busNetConnection.getBusinessNetwork().getSerializer();
  switch(testTransaction) {
      case 'placeOrder':
          transaction = factory.newTransaction(manuf_ns, 'PlaceOrder');   
          transaction.orderId = 'ORDER_' + assetId;    
          let vehicle = factory.newConcept(vda_ns, 'VehicleDetails');
          vehicle.make = 'testMake';
          vehicle.modelType = 'testModel';
          vehicle.colour = 'testColour';
          transaction.vehicleDetails = vehicle;
          transaction.manufacturer = factory.newRelationship(manuf_ns, 'Manufacturer', 'MANUFACTURER_1');
          transaction.orderer = factory.newRelationship(base_ns, 'PrivateOwner', 'PRIVATEOWNER_' + assetId++);
          break;
      case 'updateOrderStatus':
          transaction = factory.newTransaction(manuf_ns, 'UpdateOrderStatus');   
          transaction.order = factory.newRelationship(manuf_ns, 'Order', 'ORDER_' + assetId++);
          transaction.orderStatus = 'PLACED';
          break;
      case 'scrapVehicle':
          transaction = factory.newTransaction(vda_ns, 'ScrapVehicle');
          transaction.vehicle = factory.newRelationship(vda_ns, 'Vehicle', 'VEHICLE_' + assetId++);
          break;
      default:
          throw new Error('No valid test Transaction specified');
  }
  return bc.bcObj.submitTransaction(busNetConnection, transaction);
}

module.exports.end = function(results) {
  return Promise.resolve(true);
};