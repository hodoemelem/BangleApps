 var connected = false;
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
 
   //if (stop ==1){resetService();} //uncomment to do recording only one time
    
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


  
  Bangle.on('accel', onAccel)

}


 onInit();




