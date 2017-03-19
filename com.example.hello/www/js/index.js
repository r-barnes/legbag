var app = {
  ble_enabled: true,    //Used for debugging
  ble_address: null,    //Hold address of associated bluetooth device
  
  update_interval: 5,  //Seconds between updating interface times //TODO: Longer

  empty_duration: 2,    //Seconds
  empty_handle:   null, //Handle of emptying process. Used to cancel.
  empty_data:     null, //Data structure containing info about previous empty events
  empty_last:     null,

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

    $('#confirm').on('touchend',self.interfaceZeroSlider.bind(this));
    $("#confirm").on('change', self.interfaceSliding.bind(this));

    self.dataLoad();
    self.interfaceUpdateTimes();
    setInterval(self.interfaceUpdateTimes.bind(this), self.update_interval*1000);

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

  bleWrite: function(msg, succfunc){
    var self          = this;
    var bytes         = bluetoothle.stringToBytes(msg);
    var encodedString = bluetoothle.bytesToEncodedString(bytes);
    bluetoothle.write(
      function(result){
        if(result.status=="written" && succfunc)
          succfunc();
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

  bagEmpty: function(succfunc){
    this.bleWrite("O", succfunc); //TODO
    this.dataAddEmpty();
  },

  bagStopEmpty: function(succfunc){
    this.bleWrite("C", succfunc); //TODO
  },

  dataLoad: function(){
    this.empty_data = window.localStorage.getItem("emptyings");
    if(this.empty_data===null){
      this.empty_data = [];
    } else {
      this.empty_data = JSON.parse(this.empty_data);
      for(i in this.empty_data)
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

  interfaceDoBagEmpty: function(){ //TODO: Use clearTimeout(myVar); to cancel
    var self = this;

    $("#confirm").fadeOut();
    $("#arrows").fadeOut();
    $("#emptying").fadeIn();
    self.bagEmpty(function(){
      self.dataAddEmpty(new Date());
      self.interfaceUpdateTimes();

      self.empty_handle = setTimeout(function(){
        $('#confirm').val(0);
        $("#confirm").fadeIn();
        $("#arrows").fadeIn();
        $("#emptying").fadeOut();
        self.bagStopEmpty();
      }, self.empty_duration*1000);
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

    var hours = Math.floor(secs/3600)
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

  interfaceZeroSlider: function(){ //TODO: Does Rafe like this sliding back behavior?
    var slidepos = $('#confirm').val();
    if(slidepos==0 || slidepos>90)
      return;
    $('#confirm').val(slidepos-1);
    setTimeout(this.interfaceZeroSlider.bind(this), 5);
  },

  interfaceSliding: function(){
    var slidepos = $('#confirm').val();
    if(slidepos > 90)
      this.interfaceDoBagEmpty();
  }
};

app.initialize();

app.onDeviceReady();