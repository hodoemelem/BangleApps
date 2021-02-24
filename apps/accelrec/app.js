/*var connected = false;
var started = 0;
var count = 0;
var filename = "Adata"+".bin";
var SAMPLES = 50;
var b = new Uint8Array(SAMPLES *6 ); 
var getData = 1;
var accelIdx = 0;   
var numSamples = 0;
var stop =0;
var datalen =0;
//Service to Advertise 
 options = {
      advertise: ['4faf0001-1fb5-459e-8fcc-c5c9c331914b'],
      uart: false,
  };

function onAccel(a) {
  if (connected) {

	  started = 1;
    LED1.set(); //red led on when conneted to BLE
    
    
	  if(getData){//Show this when reading
		 g.clear(1).setFont("6x8",2).setFontAlign(0,0);
         g.drawString("Reading...",g.getWidth()/2,g.getHeight()/2);
	  }
    
	  getData = 0;
	
	   b[accelIdx+0] = Bangle.accelRd(0x06,1);
  b[accelIdx+1] =  Bangle.accelRd(0x07,1);
  b[accelIdx+2] =  Bangle.accelRd(0x08,1);
  b[accelIdx+3] =  Bangle.accelRd(0x09,1);
  b[accelIdx+4] =  Bangle.accelRd(0x0A,1);
  b[accelIdx+5] =  Bangle.accelRd(0x0B,1);
  accelIdx =accelIdx+6;
	
	  
	   numSamples++;
 
  
    
     if(numSamples>=SAMPLES ){
       
		 accelIdx=0;
         numSamples=0;
       
		 g.clear(1).setFont("6x8",2).setFontAlign(0,0);
         g.drawString("Write to Flash",g.getWidth()/2,g.getHeight()/2);
		 
	      require("Storage").write(filename, b,0);
     
		 uploadToweb(); // Upload Data to Web
         getData = 1;
	 
	 }
    
     
	 
  }
}

function uploadToweb()//Seems Espruino only allows 20 Bytes of Data to be sent at a time.
{
  
       
       //Send Data from flash to web in blocks of 20 Bytes at a time
	   for (var i=0; i<SAMPLES*6; i=i+20) {
	   var mydata = require("Storage").read(filename,i,20);
	   
       
	    NRF.updateServices({
          '4faf0001-1fb5-459e-8fcc-c5c9c331914b': {
          '4faf0002-1fb5-459e-8fcc-c5c9c331914b': {
          value: mydata,
          notify: true,
          maxLen : 20,
          
          }
        }
        })
		 
		   
    
		 g.clear(1).setFont("6x8",2).setFontAlign(0,0);
         g.drawString(mydata,g.getWidth()/2,g.getHeight()/2);
		   
	   }

	   
       //Code block to signify end of Actual Data
	   mydata = "StOpBaNgLeJsNoW";
	   NRF.updateServices({
          '4faf0001-1fb5-459e-8fcc-c5c9c331914b': {
          '4faf0002-1fb5-459e-8fcc-c5c9c331914b': {
          value: mydata,
          notify: true,
          maxLen : 15,
          
          }
        }
        })
	   
	   
	   g.clear(1).setFont("6x8",2).setFontAlign(0,0);
       g.drawString(mydata,g.getWidth()/2,g.getHeight()/2);
	   
     stop =1;
		
}
  
function resetService()
{
  //Restart BangleJS
  if(started ==1)
     {
	  
	  reset();
	  E.reboot();
	  E.setBootCode();
	  
     }
	
	
}

function onInit() {

  NRF.on('connect', function () { connected = true; Bangle.setCompassPower(1); })
  NRF.on('disconnect', function () { connected = false; Bangle.setCompassPower(0); })
  NRF.on('disconnect', function () { connected = false; resetService(); })
  
  // declare the services
  NRF.setServices({
     '4faf0001-1fb5-459e-8fcc-c5c9c331914b': {
       '4faf0002-1fb5-459e-8fcc-c5c9c331914b': {
        value: "0",
        maxLen : 20,
        notify: true,
        readable: true,
       
      }
    },
  
  }, options)


  g.clear(1).setFont("6x8",2).setFontAlign(0,0);
  g.drawString("Connect to Activate",g.getWidth()/2,g.getHeight()/2);
  Bangle.on('accel', onAccel)

}


 onInit();

*/

/*
 *   Activate App for Bangle.js v0.3 alpha stable
 *   Date: 2021-02-15,
 *   This is the third stable version -- able to log raw acc data and HR at
 *   given sampling rates and g ranges, with lossless delta compression. And
 *   with BLE uploading of all binary files.
 *   Use with retrieve.html and viz_v3.py v0.3 alpha.
 *   Known problems:
 *    - Waiting for accelerometer: acc events are sometimes not triggered
 *    - 50, 100Hz data rate is not exactly attained
 *   Authors: Henry Odoemelem, Kristof Van Laerhoven
 */

// settings:
const PAGE_SIZE = 1200*6;     // minimum 1200 samples (of 6 bytes) per RAM file
const HEADER_SIZE = 32;       // each flash file has a header of 32 bytes 
const PAGES_FLASH = 28;       // each flash file contains 28 pages
const FLASHF_SIZE = HEADER_SIZE+PAGES_FLASH*PAGE_SIZE; // bytes per flash file
const MAX_FILES = 18;         // 18 files max are recorded, 20 should still work
const STATUS_SIZE = 14;       // bytes in the status array

const HRM_LOGGING = true;
const HZ = 100;         // sampling rate of accelerometer
const GS = 8;          // sensitivity of accelerometer

// global variables:
// buffer of acc output, 6 bytes per XYZ reading or 3 for delta-compressed:
var b = new Uint8Array(PAGE_SIZE);
var header = new Uint8Array(HEADER_SIZE);  // buffer for file header
var currMSBs = new Uint8Array(3);  // storage for current MSBs per axis
var prevMSBs = new Uint8Array(3);  // storage for previous MSBs per axis
var myStatus = new Uint8Array(STATUS_SIZE); // storage for status (charge, temp, etc)
var deltaOn = false;
var deltaIdx = -1;
var accelIdx = 0;             // iterates through the buffer 
var statusIdx = 0;
var pagesIdx = HEADER_SIZE;   // iterates through the page
var numPages = 0;
var numFiles = 0;
var filename = "            ";
var today, h, m;
var todayStr = "        ";
var stepStr = "0.0k";
var steps = 0;
var isLogging = true;
var isConnected = true;
var bleInt = 0;  // Interval timer to send BLE status messages

// KIONIX Accelerometer Registers:

 // KI_CNTL1 register: responsible for controlling main features
 const KI_CNTL1  = 0x18;
 var KI_GS;
 switch (GS) {
   case 2: KI_GS = 0x00; break; // sensitivity = �2g
   case 4: KI_GS = 0x08; break; // sensitivity = �4g
   case 8: KI_GS = 0x10; break; // sensitivity = �8g
   default:KI_GS = 0x10; break;
 }
 const KI_DRDYE  = 0x20;  // data ready interrupt enable
 const KI_PC1ON  = 0x80;  // operating mode (not standby)

 // KI_ODCNTL register: responsible for configuring output data rate, filter settings
 const KI_ODCNTL = 0x1B;
 var KI_HZ;
 switch (HZ) {
   case 12.5:  KI_HZ = 0x00; break; // 12.5 Hz
   case 25:    KI_HZ = 0x01; break; // 25 Hz
   case 50:    KI_HZ = 0x02; break; // 50 Hz
   case 100:   KI_HZ = 0x03; break; // 100 Hz
   case 200:   KI_HZ = 0x04; break; // 200 Hz
   case 400:   KI_HZ = 0x05; break; // 400 Hz
   case 3.125: KI_HZ = 0x0A; break; // 3.125 Hz
   case 6.25:  KI_HZ = 0x0B; break; // 6.25 Hz
   default:  KI_HZ = 0x03; break;
 }
 const KI_ODR_2  = 0x40; // ODR/2 filter
 const KI_IIR_B  = 0x80; // IIR filter bypassed

 // KI_BUF_CNTL1 register: responsible for configuring buffer watermark threshold 
 const KI_BUF_CTL1 = 0x3A;

 // KI_BUF_CNTL2 register: responsible for configuring buffer operation 
 const KI_BUF_CTL2 = 0x3B;
 const KI_BUFSTREAM= 0x01;  // buffer in stream mode
 const KI_BUF_IE   = 0x20;  // buffer full interrupt enable
 const KI_BRES_16  = 0x40;  // buffer with 16-bit samples 
 const KI_BUF_ACT  = 0x80;  // sample buffer active

// icons:
const ic_foot = require("heatshrink").decompress(atob("kEgyAPMj3fAIYxbELYbFELIfLEKIddEL4bNL8IhNDaI/jEZIbTIJohdH/4/9Dao/jEYo//H/4//H/4//Dq4/9HpYjfH/4//AH4A/AH4A/ABse74BBC9YbHAJohtH/4//H/4//D6I/fD/4fPEJodRD8IhJDqofVA="));
const ic_chrg = require("heatshrink").decompress(atob("kEgyBC/AH4A/AH4A/AH4A/AH4AC/tLAOY99H/5BJEr0rIb6ddABrdxINYdNH+YAjXO4/nIaYRNIMf9lYxVHsyHQGtaJTDKqPvTqY99IPI/JAH4A/AH4A/AH4A/AH4A9A"));
const ic_hart = require("heatshrink").decompress(atob("kEgyBC/AH4A/AH4AK/ABBgIBHD6gdID6YdLEaIddD6YlJDa5DJELLTBH8I9aAMA//HoQ/8AP4B/AP4B/AIMAgA//Hvo//IPY9FIO49JIOY9NIIhDpHiJDpHbDHlHzxDHI6g7jQ647rIZ47zIIxDCHvIA/AH4A/AEYA=="));


// Show clock face and update time variables
function updateWatchFace(firstDraw) {"ram";
  today = new Date(); h = today.getHours(); m = today.getMinutes(); // Update all time variables
  todayStr = today.getFullYear()+("0"+(today.getMonth()+1)).substr(-2);
  todayStr += ("0"+today.getDate()).substr(-2);
  // update status array:
  myStatus[0] = h; myStatus[1] = m; myStatus[2] = 0; myStatus[3] = 0; myStatus[4] = 0; // time
  //myStatus[5] = steps; myStatus[6] = steps>>8; myStatus[7] = steps>>16; myStatus[8] = steps>>24
  myStatus[9] = E.getBattery(); myStatus[10] = E.getTemperature(); // context
  // myStatus[11] and myStatus[12] will be filled in by HRM 
  myStatus[13] = 0xFF;
  // prep h and m for printing:
  h = ("0"+h).substr(-2); m = ("0"+m).substr(-2);
  if (firstDraw) {
    g.clear();  // clear entire screen and draw borders / circles for first time
    g.setColor(0xF844).fillCircle(207,42,30).setColor(0xFA88).fillCircle(207,42,28).setColor(0).fillCircle(207,42,26);
    g.setColor(0xFD20).fillCircle( 29,39,30).setColor(0xFF64).fillCircle( 29,39,28).setColor(0).fillCircle( 29,39,26);
    g.setColor(0x07FF).fillCircle(120,29,30).setColor(0x29FF).fillCircle(120,29,27).setColor(0).fillCircle(120,29,25);
    g.drawImage(ic_foot,105,7).drawImage(ic_chrg,14,17).drawImage(ic_hart,191,19); // draw icons
    g.setColor(0xFFFF).fillCircle(119,114,7).fillCircle(119,150,7);
  }
  g.setFontAlign(-1,-1,0).clearRect(0,80,111,190).clearRect(128,80,240,190);
  g.setFont("Vector",109).setColor(0xFFFF).drawString(h.substr(0,1),-2,80);
  g.drawString(h.substr(1,1),56,80);
  g.drawString(m.substr(0,1),129,80).drawString(m.substr(1,1),187,80);
  g.setFont("Vector",37).setColor(0xFFE0).clearRect(17,192,225,219);
  g.drawString(todayStr.substr(6,2), 17, 190);
  g.drawString(todayStr.substr(4,2), 77, 190);
  g.drawString(todayStr.substr(0,4),137, 190);
  g.setFont("Vector",17);
  if (isLogging) {
    g.setColor(0x00FF).clearRect(70,226,200,240);
    g.drawString(("00000"+accelIdx).substr(-5)+"/"+("0"+numPages).substr(-2)+"/"+numFiles,70,226);
  }
  g.setFont("Vector",12);
  g.setColor(0x07FF).clearRect(109,42,130,52).drawString(stepStr, 109, 42);
  g.setColor(0xFE82).clearRect( 15,47, 43,59).drawString(myStatus[9]+"%", 15, 47); // charge
  g.setColor(0xF844).clearRect(197,50,220,60).drawString(myStatus[11], 197, 50); // placeholder for content later
}

// update info for the header
function prepHeader() {"ram";
  let millis = parseInt(Date().getTime());
  let h = longToByteArray(millis);
  for (var i=0; i<8; i++) {
    header[i] = h[i];  // store milliseconds since 1970
  }
  header[8]=KI_GS; header[9]=KI_HZ; // store acc settings
}

// Trigger accelerometer readings
function accelHandlerTrigger(a) {"ram";
  updateWatchFace(true);
  prevMSBs = [0xFF,0xFF,0xFF];
  Bangle.removeListener('accel',accelHandlerTrigger);
  prepHeader(); // init header for first page
  Bangle.on('accel',accelHandlerRecord);
  Bangle.on('step', function(up) {
      myStatus[5]++;
      if (myStatus[5]==0) {
        myStatus[6]++;
        if (myStatus[6]==0) {
          myStatus[7]++;
          if (myStatus[8]==0) {
            myStatus[8]++;
          }
        }
      }
      if (myStatus[5]%100==0) {
          stepStr=Number(++steps/10).toFixed(1)+"k";
      }
  });
}

// Handle a single I2C packet from the accelerometer:
function accelHandlerRecord(a) {"ram";
  currMSBs = [ (a.x*8192)>>8, (a.y*8192)>>8, (a.z*8192)>>8 ];
  if ((accelIdx>5)&&(currMSBs[0]==prevMSBs[0])&&(currMSBs[1]==prevMSBs[1])&&(currMSBs[2]==prevMSBs[2])){
    if (!deltaOn) {
      b[accelIdx]=0xFF; b[accelIdx+1]=0xFF; // mark the next samples as delta-compressed 
      b[accelIdx+2]=0; deltaIdx = accelIdx+2; // here comes the delta counter
      b[accelIdx+3]=(a.x*8192); b[accelIdx+4]=(a.y*8192); b[accelIdx+5]=(a.z*8192);
      accelIdx+=6;
      deltaOn=true;
    } else {
      b[accelIdx]=(a.x*8192); b[accelIdx+1]=(a.y*8192); b[accelIdx+2]=(a.z*8192);
      b[deltaIdx]++; // add one more count to track delta compression
      if (b[deltaIdx]>253) { // overflow in delta counter? Then start again!
        deltaOn=false; deltaIdx = -1;
        prevMSBs = [0xFF,0xFF,0xFF]; // force a new full read at the next slot
      }
      accelIdx+=3; // Delta compression uses packages of only half the size
    }
  } else {   // get the raw acc values without compression
    b[accelIdx+0] = (a.x*8192); b[accelIdx+1] = currMSBs[0];
    if ((b[accelIdx+0]==0xFF)&&(b[accelIdx+1]==0xFF)) {b[accelIdx+0]=0xFE;}
    b[accelIdx+2] = (a.y*8192); b[accelIdx+3] = currMSBs[1];
    b[accelIdx+4] = (a.z*8192); b[accelIdx+5] = currMSBs[2];
    accelIdx+=6;
    deltaOn=false;
    prevMSBs = currMSBs;  // store MSBs
  }
  // update watch now and then:
  for (var i=1200; i<PAGE_SIZE; i+=1200) {
    if ((accelIdx>i) && (accelIdx<i+7)) {
      updateWatchFace(false);  // redraw only numbers
      todayStr += h+m;  // for naming the dataset file with date and time
    }
  }
  // did we almost fill our page (RAM file)?
  if (accelIdx+3>=PAGE_SIZE) {
    while (accelIdx<PAGE_SIZE) {
      b[accelIdx]=0xFF;
      accelIdx++;
    }
    if (isLogging) {
      saveToFlash();
    } else {
      accelIdx = 0;
      deltaIdx = -1;
      deltaOn=false;
      currMSBs = [0xFF,0xFF,0xFF];
    }
  }
}

// helper function, since javascript doesn't handle uint64 (bah!)
longToByteArray = function(long) {
  var byteArray = [0,0,0,0,0,0,0,0];
  for (var i=0; i<byteArray.length; i++) {
    var byte = long&0xFF;
    byteArray[i] = byte;
    long = (long-byte)/256 ;
  }
  return byteArray;
};

// Save current buffer in RAM to flash file
function saveToFlash() {"ram";
  if (numPages==0) {  // write header (today's date, etc.) in new logfile:
      filename = "d"+todayStr+".bin";
      try {
        require("Storage").write(filename, header, 0, FLASHF_SIZE);
      }
      catch(err) { //catch(err) {
        // no flash memory available
        numPages = PAGES_FLASH; // trigger record stop
        return;
      }
      pagesIdx = HEADER_SIZE;
  }
  require("Storage").write(filename, b, pagesIdx, FLASHF_SIZE);
  numPages++;
  pagesIdx += accelIdx;
  accelIdx = 0;
  deltaIdx = -1;
  deltaOn=false;
  currMSBs = [0xFF,0xFF,0xFF];
  if (HEADER_SIZE+(numPages+1)*PAGE_SIZE>FLASHF_SIZE) {
    numPages=0;
    prepHeader();  // prepare the header for the next file
    numFiles++;
    if (numFiles>=MAX_FILES)
      recordStop(); // stop recording
  }
}

// Start Accelerometer and HRM, start BLE feedback:
function recordStart() {"ram";
  // activate Heart Rate Monitoring:
  if (HRM_LOGGING)
    Bangle.on('HRM', function(hrm) {
        myStatus[11] = hrm.bpm;
        myStatus[12] = hrm.confidence;
      }
    );
  // BLE feedback myStatus:
  //Bluetooth.on('data', function(data) { ... })
  NRF.on('connect', function() {isConnected=true;});
  NRF.on('disconnect', function() {isConnected=false;});
  // we log and send the status every minute:
  bleInt = setInterval( function() {
        require("Storage").write("d20statusmsgs.bin", myStatus, STATUS_SIZE*statusIdx, STATUS_SIZE*1200);
        statusIdx++;
        //if (isConnected) {
          //Bluetooth.write(myStatus);  // this uses bytes
          //Bluetooth.println(myStatus);  // this pretty-prints the buffer
        //}
  }, 60000 );
  //0x18: bit: 7:CNTL1 Off, 6: low power, 5: DRDYE, 4-3: g range, 2:TDTE (tap enable), 1:Wakeup, 0:Tilt
  Bangle.accelWr(KI_CNTL1,0b01101100);  // CNTL1 off, low-pow, 4g range, TDTE noWakeup noTilt
  Bangle.accelWr(KI_ODCNTL, KI_HZ | KI_ODR_2); // 100hz output, ODR/2 filter
  Bangle.accelWr(KI_CNTL1,0b11100100 | KI_GS); // CNTL1 on, low-pow, KI_GS range, TDTE noWakeup noTilt
  Bangle.setPollInterval(1000/HZ);  //  10 ms for 100Hz
  setTimeout(function() {
    Bangle.on('accel',accelHandlerTrigger);
    g.clearRect(0,226,240,240).drawString("Waiting for accelerometer",120,220);
  }, 1000);
  // Once connected, obtain all binary filenames of the past day and send them over BLE:
  NRF.on('connect', function() { setTimeout(uploadFiles,4000); });
}

// Set accelerometer to 12.5Hz, turn off HRM, go in upload mode:
function recordStop() {"ram";
  if (bleInt) clearInterval(bleInt); bleInt = undefined; // stop sending status packets
  Bangle.setPollInterval(80); // default poll interval
  Bangle.accelWr(KI_CNTL1,0b01101100); // off, +-4g
  Bangle.accelWr(KI_ODCNTL, 0); // default 12.5hz output
  Bangle.accelWr(KI_CNTL1,0b11101100); // +-4g
  Bangle.removeListener('accel',accelHandlerRecord);
  Bangle.setHRMPower(0); // Heart rate measurement off
  isLogging=false; // stop logging
  g.setFont("Vector",17).setColor(0xFFFF).clearRect(70,226,200,240).drawString("ready",70,226);
}

// upload all binary files via BLE:
function uploadFiles() {
  recordStop();
  isConnected=true;
  updateWatchFace(1);
  g.setFont("Vector",17).setColor(0xFFFF).clearRect(70,226,200,240).drawString("uploading...",70,226);
  // iterate over files:
  var fList = require("Storage").list(/d20...........bin/);
  for (var i=0; i<fList.length; i++) {
    // start with sending the file name:
    NRF.updateServices({
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e': {
      '6e400003-b5a3-f393-e0a9-e50e24dcca9e': {
        value:fList[i], notify:true, maxLen:17,}}});
    // then copy all file contents, 20 bytes at a time..
    for (var fi=0; fi<FLASHF_SIZE; fi+=20) {
      var mydata = require("Storage").read(fList[i],fi,20);
      NRF.updateServices({
            '6e400001-b5a3-f393-e0a9-e50e24dcca9e': {
              '6e400003-b5a3-f393-e0a9-e50e24dcca9e': {
                value: mydata, notify: true, maxLen:20,}}});
      if ((fList[i][3]=='s')&&(fi>=16800)) {  // if d20statusmsgs.bin:
        fi=FLASHF_SIZE;
      }
      g.drawString("uploading...",70,226); // this causes a delay that seems needed :-S
    }
    // signify end of file:
    NRF.updateServices({
    '6e400001-b5a3-f393-e0a9-e50e24dcca9e': {
      '6e400003-b5a3-f393-e0a9-e50e24dcca9e': {
        value:[255,255,255,255,255,0,0,0,0,0,0,255,255,i,fList.length-1], notify:true, maxLen:15,}}});
    updateWatchFace(0);
  }
  //require("Storage").erase(fList[i]);
  require("Storage").compact();
  g.setFont("Vector",17).setColor(0xFFFF).clearRect(70,226,200,240).drawString("upload done",70,226);
  //NRF.on('connect', function() {isConnected=true;});  // and do not upload all files after a connect
  setInterval(updateWatchFace, 3000); // from here onwards, just update the watch face
  setTimeout(function(){NRF.removeAllListeners('connect');NRF.disconnect();},7000);
}

// start the Activate app:
function startActivate() {
  // try not to switch on the watch with gestures, set power mode:
  Bangle.setOptions({wakeOnBTN1:true, wakeOnBTN2:false, wakeOnBTN3:false, wakeOnFaceUp:false, 
                     wakeOnTouch:false, wakeOnTwist:false, powerSave:false});
  Bangle.setCompassPower(0);
  Bangle.setGPSPower(0);
  Bangle.setHRMPower(HRM_LOGGING); // Heart rate measurement on or off?
  Bangle.setLCDBrightness(1); // full screen brightness
  Bangle.setLCDMode();

  // iterate over files, get rid of them, and compact flash memory:
  var fList = require("Storage").list(/d20...........bin/);
  for (var i=0; i<fList.length; i++) {
    console.log("deleting "+fList[i]);
    require("Storage").erase(fList[i]);
  }
  require("Storage").compact();

  // pressing button 1 turns on the LCD:
  //setWatch(function(){Bangle.setLCDPower(1);}, BTN1, {edge:"rising", debounce:50, repeat:true});

  // pressing button 2 shows Launcher:
  //setWatch(Bangle.showLauncher, BTN2, { repeat: false, edge: "falling" });

  // pressing button 3 toggles logging:
  //setWatch(function() {"ram";
    //isLogging = !isLogging;
  //}, BTN3, {edge:"rising", debounce:50, repeat:true});

  // setup logo and startup screen:
  g.reset();
  g.clear();
  g.setFontVector(24).setFontAlign(0,0);
  g.drawString("Activate App v3.1",120,220);
  g.fillCircle(120,100,100).setColor(0, 0, 0);
  g.fillCircle(120,100,85).setColor(1,1,1);
  g.fillCircle(120,100,60).setColor(0, 0, 0);
  g.fillCircle(120,100,45).setColor(1,1,1);
  g.fillCircle(120,100,20);
  g.fillRect(111,0,129,100).setColor(0, 0, 0);
  g.fillPoly([130,0,130,83,240,0]).setColor(1,1,1).flip();
  setTimeout(recordStart,3500);
  NRF.disconnect();
}

// start our app:
Bangle.buzz().then(()=>{
  g.reset();
  startActivate();
});


