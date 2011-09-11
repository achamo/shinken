var labelType, useGradients, nativeTextSupport, animate;

(function() {
    var ua = navigator.userAgent,
	iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
	typeOfCanvas = typeof HTMLCanvasElement,
	nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
	      textSupport = nativeCanvasSupport
	&& (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
    //I'm setting this based on the fact that ExCanvas provides text support for IE
    //and that as of today iPhone/iPad current text support is lame
    labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
    nativeTextSupport = labelType == 'Native';
    useGradients = nativeCanvasSupport;
    animate = !(iStuff || !nativeCanvasSupport);
})();

var Log = {
    elem: false,
    write: function(text){
	if (!this.elem)
	    this.elem = document.getElementById('log');
	this.elem.innerHTML = text;
	//this.elem.style.left = (500 - this.elem.offsetWidth / 2) + 'px';
    }
};



function dump(arr, level) {
    var dumped_text = "";
    if(!level) level = 0;
    
    //The padding given at the beginning of the line.
    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";
    
    if(typeof(arr) == 'object') { //Array/Hashes/Objects 
	for(var item in arr) {
	    var value = arr[item];
	    
	    if(typeof(value) == 'object') { //If it is an array,
		dumped_text += level_padding + "'" + item + "' ...\n";
		dumped_text += dump(value,level+1);
	    } else {
		dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
	    }
	}
    } else { //Stings/Chars/Numbers etc.
	dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
    }
    return dumped_text;
}


window.onload = function init(){
    //init data
    //If a node in this JSON structure
    //has the "$type" or "$dim" parameters
    //defined it will override the "type" and
    //"dim" parameters globally defined in the
    //RGraph constructor.


    //init nodetypes
    //Here we implement custom node rendering types for the RGraph
    //Using this feature requires some javascript and canvas experience.
    $jit.RGraph.Plot.NodeTypes.implement({
	    'custom': {
		'render': function(node, canvas) {
		    /*First we need to know where the node is, so we can draw 
		     in the correct place for the GLOBAL canvas*/
		    var pos = node.getPos().getc();
		    var size = 24;

		    var ctx = canvas.getCtx();
		    img = new Image();
		    
		    /* We can have some missing data, so just add dummy info */
		    if (typeof(node.data.img_src) == 'undefined'){
			img.src = '/static/images/state_ok.png';
		    }else{
			img.src = node.data.img_src; //"/static/images/sets/disk/state_critical.png";
			size = size * (node.data.business_impact - 1);
		    }
		    /* We scale the image. Thanks html5 canvas.*/
		    img.width = size;
		    img.height = size;
		    /*Ok, we draw the image, and we set it in the middle ofthe node :)*/
		    ctx.drawImage(img, pos.x-size/2, pos.y-size/2, img.width, img.height);
		}
	    }
	    });


    //init RGraph
    var rgraph = new $jit.RGraph({
	    'injectInto': 'infovis',
	    'width'     : 700,  
	    'height'    : 700,
	    //Optional: Add a background canvas
	    //that draws some concentric circles.
	    'background': {
		'CanvasStyles': {
		    'strokeStyle': '#FFFFFF',
		    //'shadowBlur': 50,
		    //'shadowColor': '#ccc'
		}
	    },
	    //Add navigation capabilities:
	    //zooming by scrolling and panning.
	    Navigation: {
		enable: true,
		panning: true,
		zooming: 20
	    },
	    //Nodes and Edges parameters
	    //can be overridden if defined in
	    //the JSON input data.
	    //This way we can define different node
	    //types individually.
	    Node: {
		color: 'green',
		'overridable': true,
		type : 'custom',
	    },
	    Edge: {
		color: 'SeaGreen',
		lineWidth : 0.5,
		'overridable': true,
	    },

	    //Set polar interpolation.
	    //Default's linear.
	    interpolation: 'polar',
	    //Change the transition effect from linear
	    //to elastic.
	    //transition: $jit.Trans.Elastic.ea
	    //Change other animation parameters.
	    duration:1000,
	    fps: 30,
	    //Change father-child distance.
	    levelDistance: 75,
	    //This method is called right before plotting
	    //an edge. This method is useful to change edge styles
	    //individually.
	    onBeforePlotLine: function(adj){
		//Add some random lineWidth to each edge.
		if (!adj.data.$lineWidth)
		    adj.data.$lineWidth = 2;
	    },

	    onBeforeCompute: function(node){
		Log.write("Focusing on " + node.name + "...");

		//Make right column relations list.
		var html = "<h4>" + node.name + "</h4><b>Connections:</b>";
		html += "<ul>";
		html = node.data.infos;
		/*node.eachAdjacency(function(adj){
			var child = adj.nodeTo;
			html += "<li>" + child.name + "</li>";
		    });
		    html += "</ul>";*/
		$jit.id('inner-details').innerHTML = html;
	    },
	    //Add node click handler and some styles.
	    //This method is called only once for each node/label crated.
	    onCreateLabel: function(domElement, node){
		domElement.innerHTML = node.name;
		domElement.onclick = function () {
		    rgraph.onClick(node.id, {
			    hideLabels: false,
			    onComplete: function() {
				Log.write(" ");
			    }
			});
		};
		var style = domElement.style;
		style.cursor = 'pointer';
		style.fontSize = "0.8em";
		style.color = "#000";
	    },
	    //This method is called when rendering/moving a label.
	    //This is method is useful to make some last minute changes
	    //to node labels like adding some position offset.
	    onPlaceLabel: function(domElement, node){
		var style = domElement.style;
		var left = parseInt(style.left);
		var w = domElement.offsetWidth;
		style.left = (left - w / 2) + 'px';
	    }
	});
    //load graph.
    /*alert('Loading graph'+json_graph);*/
    rgraph.loadJSON(json_graph, 1);
    rgraph.root =  graph_root;
    //compute positions and plot
    rgraph.refresh();
    //end
    //alert('Roto is'+rgraph.root);
    //rgraph.root =  graph.get('localhost');
    rgraph.controller.onBeforeCompute(rgraph.graph.getNode(rgraph.root));
    Log.write('');

}


