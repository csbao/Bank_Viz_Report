

/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */
var globalNodes = [];
var globalForce = null;
var radiusScale = d3.scale.pow()
    .exponent(0.6)
    .range([2, 80]);
var svg = null;
var force = null



function bubbleChart() {
  // Constants for sizing
  var width = 940;
  var height = 600;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip('gates_tooltip', 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var yearCenters = {
    'Active': { x: width / 3, y: height / 2 },
    //'inactive': { x: width / 2, y: height / 2 },
    'Inactive': { x: 2 * width / 3, y: height / 2 }
  };

  // X locations of the year titles.
  var yearsTitleX = {
    'Active': 160,
    'Inactive': width - 160
  };

  // Used when setting up force and
  // moving around nodes
  var damper = 0.102;

  // These will be set in create_nodes and create_vis
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  // Charge is negative because we want nodes to repel.
  // Dividing by 8 scales down the charge to be
  // appropriate for the visualization dimensions.
  function charge(d) {
    return -Math.pow(d.radius, 2.0) / 8;
  }

  // Here we create a force layout and
  // configure it to use the charge function
  // from above. This also sets some contants
  // to specify how the force layout should behave.
  // More configuration is done below.
  force = d3.layout.force()
      .size([width, height])
      .charge(charge)
      .gravity(-0.01)
      .friction(0.9);
  globalForce = force;

  // Nice looking colors - no reason to buck the trend
  var fillColor = d3.scale.ordinal()
      .domain(['Active', 'Inactive'])
      .range(['#72ed21', '#ed3c21']);

  // Sizes bubbles based on their area instead of raw radius


  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    console.log(rawData.length);
    var myNodes = rawData.map(function (d) {
      var lengthOfActive = 134;
      if (d.status=='Active') {
        return {
          id: d.id,
          radius: radiusScale(Math.abs(d.C_eqas)),
          value: d.C_eqas,
          A_loas: d.A_loas,
          A_inlo: d.A_inlo,
          A_colo: d.A_colo,
          E_inex: d.E_inex,
          status: d.status,
          x: Math.random() * 900,
          y: Math.random() * 800
        };
      } else {
        return {
          id: d.id + lengthOfActive,
          radius: radiusScale(Math.abs(d.C_eqas)),
          value: d.C_eqas,
          A_loas: d.A_loas,
          A_inlo: d.A_inlo,
          A_colo: d.A_colo,
          E_inex: d.E_inex,
          status: d.status,
          x: Math.random() * 900,
          y: Math.random() * 800
        };
      }

    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) { return b.value - a.value; });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */

  var chart = function chart(selector, rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number by converting it
    // with `+`.
    console.log(rawData);
    var maxAmount = d3.max(rawData, function (d) { return +d.C_eqas; });
    console.log(maxAmount)
    radiusScale.domain([0, maxAmount]);
    newData = rawData.filter(function(value) {return value.C_eqas != 1; });
    // newData = rawData;
    var count = 0


    nodes = createNodes(newData);
    globalNodes = nodes.slice();

    // Set the force's nodes to our newly created nodes array.
    force.nodes(nodes);


    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3.select(selector)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll('.bubble')
        .data(nodes, function (d) { return d.id; });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    bubbles.enter().append('circle')
        .classed('bubble', true)
        .attr('r', 0)
        .attr('fill', function (d) { return fillColor(d.status); })
        .attr('stroke', function (d) { return d3.rgb(fillColor(d.status)).darker(); })
        .attr('stroke-width', 2)
        .on('mouseover', showDetail)
        .on('mouseout', hideDetail);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles.transition()
        .duration(2000)
        .attr('r', function (d) { return d.radius; });

    // Set initial layout to single group.
    groupBubbles();
  };

  /*
   * Sets visualization in "single group mode".
   * The year labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function groupBubbles() {
    force.start();
    hideYears();


    force.on('tick', function (e) {

      bubbles.each(moveToCenter(e.alpha))
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  /*
   * Helper function for "single group mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it toward the center of
   * the visualization.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToCenter(alpha) {
    return function (d) {
      d.x = d.x + (center.x - d.x) * damper * alpha;
      d.y = d.y + (center.y - d.y) * damper * alpha;
    };
  }

  // function moveRandom(alpha) {
  //   return function (d) {
  //     d.x = Math.random() * 400;
  //     d.y = Math.random() * 800;
  //   };
  // }
  /*
   * Sets visualization in "split by year mode".
   * The year labels are shown and the force layout
   * tick function is set to move nodes to the
   * yearCenter of their data's year.
   */
  function splitBubbles() {
    showYears();
    force.on('tick', function (e) {
      bubbles.each(moveToYears(e.alpha))
          .attr('cx', function (d) { return d.x; })
          .attr('cy', function (d) { return d.y; });
    });

    force.start();
  }

  /*
   * Helper function for "split by year mode".
   * Returns a function that takes the data for a
   * single node and adjusts the position values
   * of that node to move it the year center for that
   * node.
   *
   * Positioning is adjusted by the force layout's
   * alpha parameter which gets smaller and smaller as
   * the force layout runs. This makes the impact of
   * this moving get reduced as each node gets closer to
   * its destination, and so allows other forces like the
   * node's charge force to also impact final location.
   */
  function moveToYears(alpha) {
    return function (d) {
      var target = yearCenters[d.status];
      d.x = d.x + (target.x - d.x) * damper * alpha * 1.1;
      d.y = d.y + (target.y - d.y) * damper * alpha * 1.1;
    };
  }

  /*
   * Hides Year title displays.
   */
  function hideYears() {
    svg.selectAll('.year').remove();
  }

  /*
   * Shows Year title displays.
   */
  function showYears() {
    // Another way to do this would be to create
    // the year texts once and then just hide them.
    var yearsData = d3.keys(yearsTitleX);
    var years = svg.selectAll('.year')
        .data(yearsData);

    years.enter().append('text')
        .attr('class', 'year')
        .attr('x', function (d) { return yearsTitleX[d]; })
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .text(function (d) { return d; });
  }


  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr('stroke', 'black');

    var content = '<span class="name">Title: </span><span class="value">' +
        d.name +
        '</span><br/>' +
        '<span class="name">Amount: </span><span class="value">' +
        addCommas(d.value) +
        '</span><br/>' +
        '<span class="name">Status: </span><span class="value">' +
        d.status +
        '</span><br/>' +
        '<span class="name">C_eqas: </span><span class="value">' +
        d.value +
        '</span><br/>' +
        '<span class="name">A_loas: </span><span class="value">' +
        d.A_loas +
        '</span><br/>' +
            '<span class="name">A_colo: </span><span class="value">' +
            d.A_colo +
            '</span><br/>' +
            '<span class="name">A_inlo: </span><span class="value">' +
            d.A_inlo +
            '</span><br/>' +
            '<span class="name">E_inex: </span><span class="value">' +
            d.E_inex +
            '</span>'
        ;
    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this)
        .attr('stroke', d3.rgb(fillColor(d.status)).darker());
    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single group" and "split by year" modes.
   *
   * displayName is expected to be a string and either 'year' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === 'year') {
      force.start();
      splitBubbles();
    } else {
      force.start();
      groupBubbles();
    }
  };


  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }
  d3.csv('inactive.csv', function(data2) {
    // Add new column "status" and then merge the two arrays together
    data.forEach(function(element) {
      element['status'] = 'Active';
    });
    data2.forEach(function(element) {
      element['status'] = 'Inactive';
    });
    data.push.apply(data,data2);
    myBubbleChart('#vis', data);
    setupFeatures(); //delay this setup


  });

}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select('#toolbar')
      .selectAll('.button')
      .on('click', function () {
        // Remove active class from all buttons
        d3.selectAll('.button').classed('active', false);
        // Find the button just clicked
        var button = d3.select(this);

        // Set it as the active button
        button.classed('active', true);

        // Get the id of the button
        var buttonId = button.attr('id');

        // Toggle the bubble chart based on
        // the currently clicked button.
        myBubbleChart.toggleDisplay(buttonId);
      });
}

function setupFeatures() {
  // var bubbles = svg.selectAll('.bubble')

  // Remove the exit'ed node
  // node.exit().remove();



  d3.select('#C_eqas')
      .on('click', function () {

        //update nodes here

        globalNodes.forEach(function(d) {
          d.radius = radiusScale(Math.abs(d.value));
        });
        force.nodes(globalNodes).start();
        d3.selectAll('.bubble')
            .transition()
            .duration(2000)
            .attr('r', function(e) {
              return radiusScale(Math.abs(e.value)) || 0;
            })
            .attr('x', Math.random() * 900)
            .attr('y', Math.random() * 800)
        ;

            // .attr('r', function(e) {
            //    return radiusScale(Math.abs(e.value));
            // });

        // Remove active class from all buttons
        // d3.selectAll('.button').classed('active', false);
        // // Find the button just clicked
        // var button = d3.select(this);
        //
        // // Set it as the active button
        // button.classed('active', true);
        //
        // // Get the id of the button
        // var buttonId = button.attr('id');
        //
        // // Toggle the bubble chart based on
        // // the currently clicked button.
        // myBubbleChart.toggleDisplay(buttonId);

      });

  d3.select('#A_loas')
      .on('click', function () {

        var g = d3.selectAll('.bubble')
            .data(globalNodes, function(d, i) {
              return d.id;
            });

        globalNodes.forEach(function(d) {
          d.radius = radiusScale(Math.abs(d.A_loas));
        })


        // Here we create a force layout and
        // configure it to use the charge function
        // from above. This also sets some contants
        // to specify how the force layout should behave.
        // More configuration is done below.
        // force = d3.layout.force()
        //     .size([width, height])
        //     .charge(charge)
        //     .gravity(-0.01)
        //     .friction(0.9);



        force.nodes(globalNodes).start();
        d3.selectAll('.bubble')
            .transition()
            .duration(1000)
            .attr('r', function(e) {
              return radiusScale(Math.abs(e.A_loas)) || 0;
            })
            .attr('x', Math.random() * 900)
            .attr('y', Math.random() * 800)
        ;
        // force.start();
        // force
        //     .nodes(nodes)
        //     .links(links)
        //     .start();

      });

  d3.select('#A_colo')
      .on('click', function () {
        // d3.select('.bubble').forEach(function(d) {
        //   console.log(d);
        // })
        globalNodes.forEach(function(d) {
          d.radius = radiusScale(Math.abs(d.A_colo));
        });


        force.nodes(globalNodes).start();
        d3.selectAll('.bubble')
            .transition()
            .duration(1000)
            .attr('r', function(e) {
              return radiusScale(Math.abs(e.A_colo)) || 0;
            })
            .attr('x', Math.random() * 900)
            .attr('y', Math.random() * 800)
        ;


      });

  d3.select('#A_inlo')
      .on('click', function () {
        // d3.selectAll('.bubble')
        //     .transition()
        //     .duration(1000)
        //     .attr('r', function(e) {
        //       return radiusScale(Math.abs(e.A_inlo)) || 0;
        //     })
        //     .attr('x', Math.random() * 900)
        //     .attr('y', Math.random() * 800)
        // ;
        globalNodes.forEach(function(d) {
          d.radius = radiusScale(Math.abs(d.A_inlo));
        });

        force.nodes(globalNodes).start();
        d3.selectAll('.bubble')
            .transition()
            .duration(1000)
            .attr('r', function(e) {
              return radiusScale(Math.abs(e.A_inlo)) || 0;
            })
            .attr('x', Math.random() * 900)
            .attr('y', Math.random() * 800)
        ;


      });
  d3.select('#E_inex')
      .on('click', function () {
        globalNodes.forEach(function(d) {
          d.radius = radiusScale(Math.abs(d.E_inex));
        });

        force.nodes(globalNodes).start()
        d3.selectAll('.bubble')
            .transition()
            .duration(1000)
            .attr('r', function(e) {
              return radiusScale(Math.abs(e.E_inex)) || 0;
            })
            .attr('x', Math.random() * 900)
            .attr('y', Math.random() * 800)
        ;

      });
  // globalForce.nodes()
}



/*
 * Helper function to convert a number into a string
 * and add commas to it to improve presentation.
 */
function addCommas(nStr) {
  nStr += '';
  var x = nStr.split('.');
  var x1 = x[0];
  var x2 = x.length > 1 ? '.' + x[1] : '';
  var rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1' + ',' + '$2');
  }

  return x1 + x2;
}

// Load the data.
d3.csv('active.csv', display);

// setup the buttons.
setupButtons();


