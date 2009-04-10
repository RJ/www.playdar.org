/* 

Script to gradually change background colour of an element

References: 
   http://www.37signals.com/svn/archives/000558.php
   http://www.meyerweb.com/eric/tools/color-blend/

Future work: 
   Could change foreground, border colours
   Transparency

*/

function Fade(id, startColour, endColour, count, speed, delay ) {

  /* Properties */

  this.id = id;                    /* id/object ref of element to fade */
  this.startColour = startColour;  /* initial colour (3 or 6 digit) hex */
  this.endColour = endColour;      /* final colour (3 or 6 digit) hex */
  this.count = count;              /* No of steps to take during fade */
  this.speed = speed;              /* Delay in ms between steps */
  this.delay = delay;              /* Initial delay before fade begins */

  if (typeof this.id == "string") {
    this.obj = document.getElementById(id);  
  } else {
    this.obj = this.id;
  }
  this.colour = new Array();
  this.steps = 0;

  /* Methods */

  this.init = init;
  this.fade = fade;
  this.parseColour = parseColour;

  function init() {

    first = this.parseColour(this.startColour, 'hex');
    last = this.parseColour(this.endColour, 'hex');

    this.colour = new Array();
    this.colour[this.count] = this.startColour;
    for (i=0; i<this.count; i++) {
      temp = "rgb(";
      temp += parseInt(first[0]+(last[0]-first[0])/this.count*i);
      temp += ",";
      temp += parseInt(first[1]+(last[1]-first[1])/this.count*i);
      temp += ",";
      temp += parseInt(first[2]+(last[2]-first[2])/this.count*i);
      temp += ")";
      this.colour[this.count-i] = temp;
    }
    this.colour[0] = this.endColour;

    var thisObj = this;
    setTimeout( function() { thisObj.fade() }, this.delay);

  }

  function fade() {
      
    if (this.count >= 0) {

      this.obj.style.backgroundColor = this.colour[this.count--];

      // I want to do this:
      // setTimeout("this.fade()", init.speed);
      // but setTimeout runs in a different thread so 'this' 
      // is out of context. 
      // See: http://www.faqts.com/knowledge_base/view.phtml/aid/2311

      var thisObj = this;
      setTimeout( function() { thisObj.fade() }, this.speed);

    }
  }

  function parseColour(colour, t) {
    /* From: http://www.meyerweb.com/eric/tools/color-blend/ */
    var m = 1;
    col = colour.replace(/[\#rgb\(]*/,'');
    if (t == 'hex') {
      if (col.length == 3) {
        a = col.substr(0,1);
        b = col.substr(1,1);
        c = col.substr(2,1);
        col = a + a + b + b + c + c;
      }
      var num = new Array(col.substr(0,2),col.substr(2,2),col.substr(4,2));
      var base = 16;
    } else {
      var num = col.split(',');
      var base = 10;
    }
    if (t == 'rgbp') {m = 2.55}
    var ret = new Array(parseInt(num[0],base)*m,parseInt(num[1],base)*m,parseInt(num[2],base)*m);
    return(ret);
  }
}