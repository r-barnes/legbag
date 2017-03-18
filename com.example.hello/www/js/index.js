var app = {
    ble_address: null,

    UART_SERVICE_UUID: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
    TX_CHAR_UUID:      '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
    RX_CHAR_UUID:      '6E400003-B5A3-F393-E0A9-E50E24DCCA9E',

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
      var self = this;

      this.receivedEvent('deviceready');

      bluetoothle.initialize(
        function(result){
          if(result.status=="enabled"){
            self.bleScan();
          } else {

          }
        }, 
        {
          request:        true,
          statusReceiver: false,
          restoreKey:     "legbag_bluetooth"
        }
      );
    },

    bleScan: function(){
      var self = this;

      bluetoothle.startScan(
        function(result){
          if(result.status=="scanStarted"){
            //TODO
          } else if(result.status=="scanResult" && result.name=="LegBagController"){
            self.bleStopScan();
            self.bleConnect(result.address);
          }
        },
        function(){
          //TODO
        }, 
        null
      );
    },

    bleGetConnected: function() {
      bluetoothle.retrieveConnected(
        function(){
          //TODO
        },
        function(){
          //TODO
        },
        {services:['180D','2343']}
      ); //TODO: Put your service ID here
    },

    bleStopScan: function(result){
      bluetoothle.stopScan(function(){}, function(){}); //TODO: Success, Failure
    },

    bleConnect: function(address){
      var self = this;
      bluetoothle.connect(
        function(result){
          self.ble_address = address;
          console.log("Connected!");
          self.bleDiscover();
        },
        function(){
          console.log("Failed to connect!");
        },
        {address:address}
      );
    },

    bleDiscover: function(){
      var self = this;
      bluetoothle.discover(
        function(result){
          console.log(result);
          //TODO
        },
        function(result){
        }, 
        {address:self.ble_address}
      );
    },

    bleWrite: function(msg){
      var self          = this;
      var bytes         = bluetoothle.stringToBytes(msg);
      var encodedString = bluetoothle.bytesToEncodedString(bytes);
      bluetoothle.write(
        function(result){
          console.log(result); //TODO
        }, 
        function(result){
          console.log(result); //TODO
        },
        {
          address:        self.ble_address,
          service:        self.UART_SERVICE_UUID,
          characteristic: self.TX_CHAR_UUID,
          value:          encodedString
        }
      );
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
      var parentElement    = document.getElementById(id);
      var listeningElement = parentElement.querySelector('.listening');
      var receivedElement  = parentElement.querySelector('.received');

      listeningElement.setAttribute('style', 'display:none;');
      receivedElement.setAttribute('style', 'display:block;');

      console.log('Received Event: ' + id);
    }
};

app.initialize();