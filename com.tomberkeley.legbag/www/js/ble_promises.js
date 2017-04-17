bluetoothle.isScanningP = function(){
  return new Promise(function(resolve,reject){
    bluetoothle.isScanning(resolve);
  });
};

bluetoothle.closeP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.close(resolve,reject,params);
  });
};

bluetoothle.isConnectedP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.isConnected(resolve,reject,params);
  });
};

bluetoothle.stopScanP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.stopScan(resolve,reject);
  });
};

bluetoothle.disconnectP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.disconnect(resolve,reject,params);
  });
};

//Android only
bluetoothle.discoverP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.discover(resolve,reject,params);
  });
};

//iOS only
bluetoothle.servicesP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.services(resolve,reject,params);
  });
};

//iOS only
bluetoothle.characteristicsP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.characteristics(resolve,reject,params);
  });
};

//iOS only
bluetoothle.descriptorsP = function(params){
  return new Promise(function(resolve,reject){
    bluetoothle.descriptors(resolve,reject,params);
  });
};