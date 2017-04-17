/*var bluetoothle = {
  initialize: function(){},
  startScan: function(){},
  retrieveConnected: function(){},
  stopScan: function(){},
  connect: function(){},
  discover: function(){},
  stringToBytes: function(){},
  bytesToEncodedString: function(){},
  write: function(){}
}*/

//Bluetooth object docs: https://github.com/randdusing/cordova-plugin-bluetoothle

var app = {
  ble_enabled: true,   //Used for debugging
  ble_address: null,   //Hold address of associated bluetooth device
  
  update_interval: 5,  //Seconds between updating interface times //TODO: Longer
  check_interval:  5,  //Seconds between checking connection status

  check_handle: null,

  delay_inc_empty_progress: 100,

  empty_duration: 10,         //Seconds
  empty_handle:   null,       //Handle of emptying process. Used to cancel.
  empty_data:     null,       //Data structure containing info about previous empty events
  empty_start:    null,       //Time when empty started

  last_empty_attempt: new Date(), //Time when user last tried to empty bag, may or may not have been successful. Used to debounce.
  time_btwn_empties: 1500,        //Milliseconds between empty events. Used to debounce.

  gui_confirm: null,              //Confirm object

  //These values are specific to the Feather board. If a different board is
  //used, they should be adjusted to indicate the appropriate Bluetooth services
  //and characteristics.
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

    gui_confirm = $('#confirm');

    if(!(device.platform=="Android" || device.platform=="iOS")){
      window.plugins.toast.show(
        'Unrecognized phone type!\nTrying to run using Android handshake.', 
        'long',
        'center',
        function(a){/*Toast Success*/},
        function(b){/*Toast Failure*/}
      );
    }

    gui_confirm.on('touchend',self.ixnTouchEnd.bind(this));
    $('#stop').on('click',   self.ixnStop.bind(this));

    self.dataLoad();
    self.interfaceUpdateTimes();
    self.interfacePastTimes();
    setInterval(self.interfaceUpdateTimes.bind(this), self.update_interval*1000);

    self.bleInitialize().then(
      self.bleScan
    ).then(function(result){
      self.check_handle = setInterval(self.checkConnection.bind(self), self.check_interval*1000);
      return bluetoothle.stopScanP();
    }).then(function(result){
      return self.bleConnect(result.address);
    }).then(
      self.bleSubscribe
    ).catch(function(result){
      window.plugins.toast.show(
        'Error: ' + result,
        'long',
        'center',
        function(a){/*Toast Success*/},
        function(b){/*Toast Failure*/}
      );
    }).then(function(){
      //At this point we should be subscribed to the Bluetooth
    });
  },

  checkConnection: function(){
    var self = this;
    bluetoothle.isConnectedP().then(function(result){
      if(result.isConnected)
        return true;
      
      var seq = Promise.resolve();

      //Close existing connection
      if(self.ble_address!==null){
        if(device.platform=="iOS")
          seq.then(function(){
            return bluetoothle.disconnectP({address:self.ble_address});
          });
        seq.then(function(){
          return bluetoothle.closeP({address:self.ble_address});
        }).then(function(result){
          if(result.status!="closed")
            throw "Could not close connection!";
          self.ble_address = null;
          return true;
        });
      }

      seq.then(
        bluetoothle.isScanningP
      ).then(function(result){
        if(!result.isScanning){
          clearTimeout(self.check_handle);
          return self.bleScan();
        }
        return true;
      });

      return seq;
    }).catch(function(result){
      window.plugins.toast.show(
        'Disconnected. Trying to re-establish connection\n'+result, 
        'short',
        'center',
        function(a){/*Toast Success*/},
        function(b){/*Toast Failure*/}
      );
    });
  },

  bleInitialize: function(){
    var self = this;
    return new Promise(function(resolve,reject){
      bluetoothle.initialize(
        function(result){
          if(result.status=="enabled"){
            resolve(result);
          } else {
            reject(result);
          }
        }, 
        {
          request:        true,
          statusReceiver: false,
          restoreKey:     "legbag_bluetooth"
        }
      );
    });
  },

  bleScan: function(){
    var self = this;

    return new Promise(function(resolve,reject){
      bluetoothle.startScan(
        function(result){
          console.log('Scan successful', result);
          if(result.status=="scanStarted"){
            //TODO
          } else if(result.status=="scanResult" && result.name=="LegBagController"){
            resolve();
          }
        },
        function(result){
          console.log('Scan failed',result); //TODO
          reject(result);
        }, 
        null
      );
    });
  },

  bleConnect: function(address){
    var self = this;
    return new Promise(function(resolve,reject){
      bluetoothle.connect(
        function(result){
          self.ble_address = address;
          if(device.platform=="Android")
            resolve(self.connectAndroid());
          else if(device.platform=="iOS")
            resolve(self.connectIOS());
        },
        reject,
        {address:address}
      );
    });
  },

  connectAndroid: function(){
    var seq = Promise.resolve();
    seq.then(bluetoothle.discoverP);
    return seq;
  },

  connectIOS: function(){
    var seq = Promise.resolve();
    seq.then(function(){
      return bluetoothle.servicesP({
        address:  self.ble_address,
        services: [UART_SERVICE_UUID]
      });
    }).then(function(){
      return bluetoothle.characteristicsP({
        address:         self.ble_address,
        service:         UART_SERVICE_UUID,
        characteristics: [TX_CHAR_UUID, RX_CHAR_UUID]
      });
    }).then(function(){
      var a = bluetoothle.descriptorsP({
        address:        self.ble_address,
        service:        UART_SERVICE_UUID,
        characteristic: TX_CHAR_UUID
      });
      var b = bluetoothle.descriptorsP({
        address:        self.ble_address,
        service:        UART_SERVICE_UUID,
        characteristic: RX_CHAR_UUID
      });
      return Promise.all([a,b]);
    });
    return seq;
  },

  bleWrite: function(msg){
    var self          = this;
    var bytes         = bluetoothle.stringToBytes(msg);
    var encodedString = bluetoothle.bytesToEncodedString(bytes);

    return new Promise(function(resolve,reject){
      bluetoothle.write(
        function(result){
          if(result.status=="written")
            resolve(result);
          else
            reject(result);
        }, 
        reject,
        {
          address:        self.ble_address,
          service:        self.UART_SERVICE_UUID,
          characteristic: self.TX_CHAR_UUID,
          value:          encodedString
        }
      );
    });
  },

  bleSubscribe: function(){
    var self = this;

    self.subscribe_promise = new Promise(function(resolve,reject){
      bluetoothle.subscribe(
        self.subscribeReceived.bind(self),
        function(result){
          reject(result);
          console.log("subscribe failure",result); //TODO
        },
        {
          address:        self.ble_address,
          service:        self.UART_SERVICE_UUID,
          characteristic: self.RX_CHAR_UUID
        }
      );
    });

    return self.subscribe_promise;
  },

  subscribeReceived: function(result){
    if(result.status=="subscribed"){
      self.subscribe_promise.resolve();
      console.log("Subscription successful", result);
    } else if(result.status=="subscribedResult"){
      var value = bluetoothle.bytesToString(bluetoothle.encodedStringToBytes(result.value));
      $('#percent_full').text(value);
    }
  },

  bagEmpty: function(){
    return this.bleWrite("O"); //TODO
  },

  bagStopEmpty: function(){
    return this.bleWrite("C"); //TODO
  },

  dataLoad: function(){
    this.empty_data = window.localStorage.getItem("emptyings");
    if(this.empty_data===null){
      this.empty_data = [];
    } else {
      this.empty_data = JSON.parse(this.empty_data);
      for(var i in this.empty_data)
        this.empty_data[i] = new Date(Date.parse(this.empty_data[i]));
    }
  },

  dataSave: function(){
    var encoded = JSON.stringify(this.empty_data);
    window.localStorage.setItem("emptyings", encoded);
  },

  dataAddEmpty: function(date){
    this.empty_data.unshift(date);
    this.dataSave(); //TODO: May want to delay this in case it gets slow
  },

  dataMostRecentEmpty: function(){
    if(this.empty_data.length==0)
      return null;
    else
      return this.empty_data[0];
  },

  interfaceStopEmpty: function(){
    this.bagStopEmpty().then(function(){
      gui_confirm.val(0);
      gui_confirm.show();
      $("#arrows").show();
      $("#emptying").hide();
      $('#stop').hide();
      $('#empty_progress').hide();
      $('#empty_progress').css('width','0');
    });
  },

  interfaceIncEmptyProgress: function(){
    var self = this;
    var now  = new Date();
    var prog = 100*((now-empty_start)/1000)/this.empty_duration;
    $('#empty_progress').css('width',prog+"%");
    if(prog<100)
      setTimeout(this.interfaceIncEmptyProgress.bind(this), self.delay_inc_empty_progress);
  },

  interfaceDoBagEmpty: function(){ //TODO: Use clearTimeout(myVar); to cancel
    var self = this;

    gui_confirm.hide();
    $("#arrows").hide();
    $("#emptying").show();
    $('#stop').show();
    $('#empty_progress').show();
    self.bagEmpty().then(function(){
      empty_start = new Date();
      self.dataAddEmpty(new Date());
      self.interfaceUpdateTimes();
      self.interfacePastTimes();
      self.empty_handle = setTimeout(self.interfaceStopEmpty.bind(self), self.empty_duration*1000);
      setTimeout(self.interfaceIncEmptyProgress.bind(self), self.delay_inc_empty_progress);
    });
  },

  interfaceUpdateTimes: function(){
    var now         = new Date();
    var recent      = this.dataMostRecentEmpty();
    if(recent===null)
      return;
    $('#prev_time').text( recent.toLocaleString() );
    var secs = (now-recent)/1000;
    var out  = "";

    var hours = Math.floor(secs/3600);
    secs      = secs%3600;
    var mins  = Math.floor(secs/60);
    secs      = Math.floor(secs % 60);
    if(hours != 0)
      out += hours + " hrs ";
    if(mins!=0)
      out += mins + " mins ";
    out += secs + " secs ";
    out += "ago";
    $('#time_ago').text( out );
  },

  interfacePastTimes: function(){
    var out = "";
    for(var i in this.empty_data)
      out += this.empty_data[i].toLocaleString() + "<br>";
    $('#frame_previous_times').html(out);
  },

  ixnTouchEnd: function(){ //TODO: Does Rafe like this sliding back behavior?
    var slidepos = gui_confirm.val();

    if(slidepos>90){
      var now      = new Date();
      if(slidepos > 90 && (now-this.last_empty_attempt)>this.time_btwn_empties)
        this.interfaceDoBagEmpty();
    } else if(slidepos==0){
      return;
    } else {
      gui_confirm.val(slidepos-1);
      setTimeout(this.ixnTouchEnd.bind(this), 5);
    }
  },

  ixnStop: function(){
    clearTimeout(this.empty_handle);
    this.interfaceStopEmpty();
  }
};

app.initialize();

//app.onDeviceReady();


/*

bluetoothle.unsubscribe(
  function(result){
    console.log("unsubscribe success",result)
  }, 
  function(result){
    console.log("unsubscribe failure",result)
  },
  {
    address:        app.ble_address,
    service:        app.UART_SERVICE_UUID,
    characteristic: app.RX_CHAR_UUID
  }
);
*/