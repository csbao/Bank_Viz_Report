d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var settings = {
  // could be used to save settings for styling things.
}

function focus_country(country) {
    d3.selectAll("path").classed("focused", false);
    if (country) {
        var line = d3.select("." + country);
        line.classed("focused", true);
        line.moveToFront();
    }
}

// ******* Change the showX and showY function for some cases ********
var update = function(value) {
  var country = null;
  switch(value) {
    case 0:
      console.log("in case", value);
      country = null;
    case 1:
      console.log("in case", value);
        country = null;
        break;
    case 2:
      console.log("in case 2");
      country = "PRK";
      break;
    case 3:
      console.log("in case 3");
      country = "BRA";
      break;
    case 4:
      console.log("in case 4");
      country = "PAK";
      break;
    default:
      country = null;
      focus_country(country);
      break;
  }
  focus_country(country); // this applies a highlight on a country.
}
// setup scroll functionality


function display(error, world,stunting) {
  if (error) {
    console.log(error);
  } else {
      ready(world,stunting);

    var scroll = scroller()
      .container(d3.select('#graphic'));

    // pass in .step selection as the steps
    scroll(d3.selectAll('.step'));

    // Pass the update function to the scroll object
    scroll.update(update)
  }
}
function typeAndSet(d) {
    d.Y1990=+d.Y1990;d.Y1991=+d.Y1991;d.Y1992=+d.Y1992;d.Y1993=+d.Y1993;d.Y1994=+d.Y1994;d.Y1995=+d.Y1995;d.Y1996=+d.Y1996;d.Y1997=+d.Y1997;d.Y1998=+d.Y1998;d.Y1999=+d.Y1999;
    d.Y2000=+d.Y2000;d.Y2001=+d.Y2001;d.Y2002=+d.Y2002;d.Y2003=+d.Y2003;d.Y2004=+d.Y2004;d.Y2005=+d.Y2005;d.Y2006=+d.Y2006;d.Y2007=+d.Y2007;d.Y2008=+d.Y2008;d.Y2009=+d.Y2009;
    d.Y2010=+d.Y2010;d.Y2011=+d.Y2011;d.Y2012=+d.Y2012;d.Y2013=+d.Y2013;d.Y2014=+d.Y2014;d.Y2015=+d.Y2015;
    countryById.set(d.ISO, d);
    return d;
}
queue()
    .defer(d3.json, "countries.json")
    .defer(d3.csv, "NeonatalRate.csv", typeAndSet)
     .await(display);
