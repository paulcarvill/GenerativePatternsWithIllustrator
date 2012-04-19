/*

Instructions for use
--------------------

1. Save this script somewhere
2. Select a path in your Illustrator document to use as a mask for the paterns we're going to generate
3. Select File > Scripts > Other script...
4. Select this script
5. The script will run. It will fill the artboard with patterns and mask them with your selected path.

If you used a compound path in step 2, you will need to do step 6, because Illustrator won't make
compound paths into clipping masks when using a script. But you can automate it using AppleScript.
6. Open AppleScript editor (should be in Applications or Applications/Utilities) and run the 
accompanying script 'make_clipping_masks_applescript.scpt'. For this step I'm assuming you're on a Mac.
 


How it works
------------

The basic approach is:

1. Either: draw loads of paths centred on the middle point of the object we use as a clipping mask, or...
2. ...draw a grid of vertical and horizontal paths
3. Rotate or move either the vertical or horizontal lines or both

That's it. The paths can be varied in number, weight and colour by playing around with the configuration 
options at the start of the script. There's no right or wrong setting, you just need to try a few settings 
until you get something you like.

*/

/******************************************************************************/
// Configuration stuff here

// get active document
var myDocument = app.activeDocument;

// Store some dimensions
var documentWidth  = myDocument.width;
var documentHeight = myDocument.height;

// Get the selected object which we want to use as our mask
var mySelection = myDocument.selection[0]; // only get first selected object
var selectedWidth = mySelection.width;
var selectedHeight = mySelection.height;

// Create any fill colours we want to use
var blackRGB = new RGBColor();
blackRGB.red = 0;
blackRGB.green = 0;
blackRGB.blue = 0;

var whiteRGB = new RGBColor();
whiteRGB.red = 255;
whiteRGB.green = 255;
whiteRGB.blue = 255;

var redRGB = new RGBColor();
redRGB.red = 255;
redRGB.green = 0;
redRGB.blue = 0;

var yellowRGB = new RGBColor();
yellowRGB.red = 255;
yellowRGB.green = 255;
yellowRGB.blue = 0;

var orangeRGB = new RGBColor();
orangeRGB.red = 255;
orangeRGB.green = 220;
orangeRGB.blue = 0;

var greenRGB = new RGBColor();
greenRGB.red = 00;
greenRGB.green = 242;
greenRGB.blue = 0;

// Put the colours in an array so we can randomly pick one later
var colours = [blackRGB, redRGB, whiteRGB];
var altColours = [blackRGB, yellowRGB, whiteRGB];

// Set up some document defaults
myDocument.defaultFillColor = blackRGB;
myDocument.defaultStrokeColor = whiteRGB;
myDocument.defaultStrokeWidth = 10;
myDocument.defaultStroked = false;

var maskTop, maskLeft, furthestSide, furthestSideLength, shortestSide, shortestSideLength, drawBG;

var BACKGROUND = true; // whether to draw a background colour or not
var BACKGROUND_COLOUR = colours[0]; // which colour to drae the background
var RANDOM_BACKGROUND_COLOUR = false; // randomise the background colour
var RANDOM_COLOUR_SET = false;

var RANDOM_LINE_WEIGHTS = true; // vary the line weight between 0 and MAX_LINE_WEIGHT
var RANDOM_STROKE_COLOUR = 3; // use 1 for just first colour of colours array, 2 for first two, 3 for first three etc.
var FIXED_LINE_WEIGHT = 2; // all lines will be this weight if not randomised
var MAX_VERTICAL_LINES = 15; // how many vertical lines to draw
var MAX_HORIZONTAL_LINES = 5; // how many horizontal lines to draw
var MAX_TOTAL_LINES = 20;
var MAX_LINE_WEIGHT = 4; // maximum line weight when randomised
var MIN_LINE_WEIGHT = 1; // if not, ignored. should be less than max-line-weight, obviously.

var DRAW_GRIDDED = true; // if true, we draw a very formal grid of lines
var DRAW_VERTICALS = true; // draw vertical lines when drawing the grid
var DRAW_HORIZONTALS = true; // same, for horizontals
var RANDOM_VERTICAL_DISTRIBUTION = true; // draw the horizontal grid lines a bit more randonly

var RANDOMLY_ROTATE_HORIZONTALS = true;
var RANDOMLY_ROTATE_VERTICALS = false;
var RANDOM_VERTICAL_LINE_WEIGHT = true;
var RANDOM_HORIZONTAL_LINE_WEIGHT = true;
var RANDOMLY_TRANSLATE = false; // if true, we move the lines around randomly

// Warn if more than one object has been selected, because the script probably
// won't work properly if there is.
if ( myDocument.selection.length > 1 ) {
	alert('more than one object is selected. the script only works with one.');
}

// work out how many logos we can fit into the document (we add 10% padding)
var numItemsHorizontal	= Math.floor(documentWidth  /  ( selectedWidth*1.1)  );
var numItemsVertical 	= Math.floor(documentHeight /  ( selectedHeight*1.1) );





/******************************************************************************/
// Drawing stuff here

// Here we generate a logo and position it on a grid in the document.
// We draw in rows, moving left to right, based on how many logos we can fit
// onto the Illustrator artboard.
for ( var i = 0; i < numItemsVertical; i++ ) { 
	for ( var j = 0; j < numItemsHorizontal; j++ ) { 
		
		// Here we calculate the left and top positions of this particular
		// logo. We add some padding to keep the logos separated on the grid;
		maskTop = i*(selectedHeight*1.1) - documentHeight + selectedHeight*1.1;
		maskLeft = j * (selectedWidth*1.1) + selectedWidth*0.1;
		
		// Make a new group to put our paths into
		var imageGroup = myDocument.groupItems.add();
		imageGroup.name = "ImageGroup"+i+"-"+j;
		
		// Sometimes we want a background, sometimes not
		drawBackground();
		
		// Now duplicate the original selection so we can use it as a mask
		var dupe = mySelection.duplicate();
		
		drawGriddedOrCentredLines();
		
		// Move mask into the group, on top of the other objects so it can be used as a cliping mask
		dupe.move(imageGroup, ElementPlacement.PLACEATBEGINNING);
		
		// check if compound path or ImageGroup etc. as this causes an error alert and stops the script
		if (dupe.typename == 'PathItem') {
			// If a normal PathItem then apply the original selection as a clipping mask
			imageGroup.clipped = true;
		}

		// TODO: Trim masked paths from object, just to be nice and tidy
		// This doesn't seem to be possible when scripting Illustrator
		
		// Move group into place in our grid.
		imageGroup.left = maskLeft;
		imageGroup.top  = maskTop;
		
		// deselect group
		myDocument.selection = null;
	}
}

// Remove originally selected item
mySelection.remove();

// optionally save the finished file out as PDF
//saveFileToPDF("~/savedFile.pdf");


function drawGriddedOrCentredLines() {
	
	if ( DRAW_GRIDDED ) {
		drawGridded();
	} else {
		drawCentred();
	}
}


// Draws lines centred on the centre point of the object we're using as a mask
// Optionally moves the lines around randomly once they've been drawn
function drawCentred() {
	// First find the longest side of the mask. This is so that with
	// very wide or narrow masks we draw lines long enough to fill it.
	// We add some length to the lines so that when they rotate they still
	// fill the mask area
	if ( selectedWidth > selectedHeight ) {
		x1 = mySelection.left - selectedWidth*0.2;
		y1 = mySelection.top - selectedHeight/2;
		x2 = mySelection.left + selectedWidth*1.2;
		y2 = mySelection.top - selectedHeight/2;
	} else {
		x1 = mySelection.left + selectedWidth/2;
		y1 = mySelection.top + selectedHeight*0.2;
		x2 = mySelection.left + selectedWidth/2;
		y2 = mySelection.top - selectedHeight*1.2;
	}
	
	// Then draw the points for a line from furthest side to furthest
	// side. We rotate it later to get the pattern effect.
	var lineList = [
		[x1, y1],
		[x2, y2]
	];
	
	// Draw lines, up to our specified max number
	for (var k = 0; k < MAX_TOTAL_LINES; k++) {
		
		// create a new path
		var newPath = myDocument.pathItems.add();
		newPath.stroked = true;
		newPath.strokeColor = colours[ Math.floor( Math.random() * 3 )];
		
		// vary the stroke weight if we want to
		if ( RANDOM_LINE_WEIGHTS ) {
			newPath.strokeWidth = Math.random() * MAX_LINE_WEIGHT;
		} else {
			newPath.strokeWidth = FIXED_LINE_WEIGHT;
		}
		
		// draw the actual path
		newPath.setEntirePath(lineList);
		
		// rotate the path by a random angle
		newPath.rotate( Math.random() * 180 );
		
		if ( RANDOMLY_TRANSLATE ) {
			newPath.translate(
				Math.random() * selectedWidth * Math.floor(Math.random()*3 - 1),
				Math.random() * selectedHeight * Math.floor(Math.random()*3 - 1)
			);
		}
			
		// add these lines to a group
		newPath.move(imageGroup, ElementPlacement.PLACEATBEGINNING);
	}
}


// Draws a formal grid of vertical and horizontal lines. Can be manipulted quite a bit
// using the options at the top of the script
function drawGridded() {
	
	if ( DRAW_VERTICALS ) { // draw vertical lines 
		for (var i = 0, j = 0; i < MAX_VERTICAL_LINES; i++, j = Math.random()*selectedWidth) {
			
			var lineList = [
				[mySelection.left + j, mySelection.top],
				[mySelection.left + j, mySelection.top - selectedHeight]
			];
		
			newPath = myDocument.pathItems.add();
			setStrokeColour();
			newPath.stroked = true;
			
			// vary the line weight here
			if ( RANDOM_VERTICAL_LINE_WEIGHT ) {
				newPath.strokeWidth = Math.random() * MAX_LINE_WEIGHT + MIN_LINE_WEIGHT;
			} else {
				newPath.strokeWidth = FIXED_LINE_WEIGHT;
			}
	
			newPath.setEntirePath(lineList);
			
			//newPath.opacity = Math.random() * 100;
			
			if ( RANDOMLY_ROTATE_VERTICALS ) {
				newPath.rotate(Math.random() * 180);
			}
			
			newPath.move(imageGroup, ElementPlacement.PLACEATBEGINNING);
		}
	}

	if ( DRAW_HORIZONTALS ) { //draw horizontal lines 
		for (var i = 0; i < selectedHeight + 10; i += ( RANDOM_VERTICAL_DISTRIBUTION == true ? Math.random()*20 : 10)) {
			var lineList = [
				[mySelection.left, mySelection.top - i],
				[mySelection.left + selectedWidth, mySelection.top - i]
			];
		
			newPath = myDocument.pathItems.add();
			setStrokeColour();
			newPath.stroked = true;
		
			// vary the line weigt if we want to
			if ( RANDOM_HORIZONTAL_LINE_WEIGHT ) {
				newPath.strokeWidth = Math.random() * MAX_LINE_WEIGHT;
			} else {
				newPath.strokeWidth = FIXED_LINE_WEIGHT;
			}
		
			newPath.setEntirePath(lineList);

			if ( RANDOMLY_ROTATE_HORIZONTALS ) {
				newPath.rotate(Math.random() * 180);
			}
	
			newPath.move(imageGroup, ElementPlacement.PLACEATBEGINNING);
		}
	}
}



function setStrokeColour() {
	newPath.strokeColor = 
		colours[Math.floor(Math.random() * RANDOM_STROKE_COLOUR )];
}


// Add a background to the pattern, beause sometimes it just looks better.
function drawBackground() {
	if ( !BACKGROUND ) {
		return;
	}
	
	var rect = myDocument.pathItems.rectangle(
		mySelection.top,
		mySelection.left,
		selectedWidth,
		selectedHeight
	);
	
	if ( RANDOM_BACKGROUND_COLOUR ) {
		rect.fillColor = colours[ Math.floor( Math.random()*2 ) ];
	} else {
		rect.fillColor = BACKGROUND_COLOUR;
	}
	rect.stroked = false;
	rect.move(imageGroup, ElementPlacement.PLACEATBEGINNING);
}

function saveFileToPDF (dest) {
	var saveName = new File ( dest );
	saveOpts = new PDFSaveOptions();
	saveOpts.compatibility = PDFCompatibility.ACROBAT5;
	saveOpts.generateThumbnails = true;
	saveOpts.preserveEditability = true;
	myDocument.saveAs( saveName, saveOpts );
}