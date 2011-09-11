// +------------------------------------------------------------------+
// |             ____ _               _        __  __ _  __           |
// |            / ___| |__   ___  ___| | __   |  \/  | |/ /           |
// |           | |   | '_ \ / _ \/ __| |/ /   | |\/| | ' /            |
// |           | |___| | | |  __/ (__|   <    | |  | | . \            |
// |            \____|_| |_|\___|\___|_|\_\___|_|  |_|_|\_\           |
// |                                                                  |
// | Copyright Mathias Kettner 2010             mk@mathias-kettner.de |
// +------------------------------------------------------------------+
//
// This file is part of Check_MK.
// The official homepage is at http://mathias-kettner.de/check_mk.
//
// check_mk is free software;  you can redistribute it and/or modify it
// under the  terms of the  GNU General Public License  as published by
// the Free Software Foundation in version 2.  check_mk is  distributed
// in the hope that it will be useful, but WITHOUT ANY WARRANTY;  with-
// out even the implied warranty of  MERCHANTABILITY  or  FITNESS FOR A
// PARTICULAR PURPOSE. See the  GNU General Public License for more de-
// ails.  You should have  received  a copy of the  GNU  General Public
// License along with GNU Make; see the file  COPYING.  If  not,  write
// to the Free Software Foundation, Inc., 51 Franklin St,  Fifth Floor,
// Boston, MA 02110-1301 USA.

// ----------------------------------------------------------------------------
// general function
// ----------------------------------------------------------------------------

function hilite_icon(oImg, onoff) {
    src = oImg.src;
    if (onoff == 0)
        oImg.src = oImg.src.replace("hi.png", "lo.png");
    else
        oImg.src = oImg.src.replace("lo.png", "hi.png");
}




function get_url(url, handler, data, errorHandler) {
    if (window.XMLHttpRequest) {
        var AJAX = new XMLHttpRequest();
    } else {
        var AJAX = new ActiveXObject("Microsoft.XMLHTTP");
    }
    
    // Dynamic part to prevent caching
    var dyn = "_t="+Date.parse(new Date());
    if (url.indexOf('\?') !== -1) {
        dyn = "&"+dyn;
    } else {
        dyn = "?"+dyn;
    }
    
    if (AJAX) {
        AJAX.open("GET", url + dyn, true);
        if (typeof handler === 'function')
            AJAX.onreadystatechange = function() {
                if (AJAX.readyState == 4)
                    if(AJAX.status == 200)
                        handler(data, AJAX.responseText);
                    else
                        if(typeof errorHandler !== 'undefined')
                            errorHandler(data, AJAX.status);
            }
        AJAX.send(null);
        return true;
    } else {
        return false;
    }
}

function get_url_sync(url) {
    if (window.XMLHttpRequest) {
        var AJAX = new XMLHttpRequest();
    } else {
        var AJAX = new ActiveXObject("Microsoft.XMLHTTP");
    }
    
    AJAX.open("GET", url, false);                             
    AJAX.send(null);
    return AJAX.responseText;                                         
}


// ----------------------------------------------------------------------------
// GUI styling
// ----------------------------------------------------------------------------

function filter_activation(oid)
{
    var selectobject = document.getElementById(oid);
    var usage = selectobject.value;
    var oTd = selectobject.parentNode.parentNode.childNodes[2];
    var pTd = selectobject.parentNode;
    pTd.setAttribute("className", "usage" + usage);
    pTd.setAttribute("class",     "usage" + usage); 
    oTd.setAttribute("class",     "widget" + usage);
    oTd.setAttribute("className", "widget" + usage);

    var disabled = usage != "hard" && usage != "show";
    for (var i in oTd.childNodes) {
        oNode = oTd.childNodes[i];
        if (oNode.nodeName == "INPUT" || oNode.nodeName == "SELECT") {
            oNode.disabled = disabled;
        }
    }

    p = null;
    oTd = null;
    selectobject = null;
}

var gNumOpenTabs = 0;

function toggle_tab(linkobject, oid)
{
    var table = document.getElementById(oid);
    if (table.style.display == "none") {
        table.style.display = "";
        linkobject.setAttribute("className", "left open");
        linkobject.setAttribute("class", "left open");

        // Stop the refresh while at least one tab is open
        gNumOpenTabs += 1;
        setReload(0);
    }
    else {
        table.style.display = "none";
        linkobject.setAttribute("className", "left closed");
        linkobject.setAttribute("class", "left closed");

        // Re-Enable the reload
        gNumOpenTabs -= 1;
        if(gNumOpenTabs == 0)
            setReload(gReloadTime);
    }
    table = null;
}

function hover_tab(linkobject)
{
    linkobject.style.backgroundImage = "url(../htdocs/images/metanav_button_hi.png)";
}

function unhover_tab(linkobject)
{
    linkobject.style.backgroundImage = "url(../htdocs/images/metanav_button.png)";
}

// ----------------------------------------------------------------------------
// PNP graph handling
// ----------------------------------------------------------------------------

function pnp_error_response_handler(data, statusCode) {
    fallback_graphs(data);
}

function pnp_response_handler(data, code) {
    var valid_response = true;
    var response = null;
    try {
        response = eval(code);
        for(var i in response) {
            var graph = response[i];
            create_graph(data, '&' + graph['image_url'].replace('&view=1', ''));
            i = null;
        }
    } catch(e) {
        valid_response = false;
    }

    if(!valid_response)
        fallback_graphs(data);
}

// Fallback bei doofer/keiner Antwort
function fallback_graphs(data) {
   for(var i in [0, 1, 2, 3, 4, 5, 6, 7]) {
       create_graph(data, '&host=' + data['host'] + '&srv=' + data['service'] + '&source=' + i);
   }
}

function create_graph(data, params) {
    var urlvars = params + '&theme=multisite&baseurl='+data['base_url'];
    var container = document.getElementById(data['container']);

    var img = document.createElement('img');
    img.src = data['pnp_url'] + 'index.php/image?view=' + data['view'] + urlvars;

    if (data.with_link) {
        var link = document.createElement('a');
        link.href = data['pnp_url'] + 'index.php/graph?' + urlvars;
        link.appendChild(img);
        container.appendChild(link);
    }
    else {
        container.appendChild(img);
    }

    img = null;
    link = null;
    container = null;
    urlvars = null;
}

function render_pnp_graphs(container, site, host, service, pnpview, base_url, pnp_url, with_link) {
    var data = { 'container': container, 'base_url': base_url,
                 'pnp_url':   pnp_url,   'site':     site,
                 'host':      host,      'service':  service,
                 'with_link': with_link, 'view':     pnpview};
    get_url(pnp_url + 'index.php/json?&host=' + host + '&srv=' + service + '&source=0',
            pnp_response_handler, data, pnp_error_response_handler);
}

// ----------------------------------------------------------------------------
// Synchronous action handling
// ----------------------------------------------------------------------------
// Protocol is:
// For regular response:
// [ 'OK', 'last check', 'exit status plugin', 'output' ]
// For timeout:
// [ 'TIMEOUT', 'output' ]
// For error:
// [ 'ERROR', 'output' ]
// Everything else:
// <undefined> - Unknown format. Simply echo.

function actionResponseHandler(data, code) {
    var oImg = data.get('img');
    var action = data.get('action');
    var validResponse = true;
    var response = null;
    var message_icon = 'errorMedium.png';
    var message_title = 'Unknown error';
    var message_text = 'An unknown error occurs during the action' + action;

    try {
        response = eval(code);
    } catch(e) {
        validResponse = false;
    }

    if(validResponse && response[0] === 'OK') {
        oImg.src   = '../htdocs/images/icon_reload.gif';
        window.location.reload();
	message_icon = "okMedium.png";
	message_title = 'Success!';
	message_text = 'Command '+action+ ' is successful.';
	
    } else if(validResponse && response[0] === 'TIMEOUT') {
        oImg.src   = '../htdocs/images/icon_reload_failed.gif';
        oImg.title = 'Timeout while performing action: ' + response[1];
	message_icon = "errorMedium.png";
	message_title = 'Timeout!';
	message_text = 'Command '+action+ ' go in timeout : ' + response[1];

    } else if(validResponse) {
        oImg.src   = '../htdocs/images/icon_reload_failed.gif';
        oImg.title = 'Problem while processing - Response: ' + response.join(' ');
	message_icon = "errorMedium.png";
        message_title = 'Error!';
        message_text = 'Problem while processing '+action+'- Response: ' + response.join(' ');

    } else {
        oImg.src   = '../htdocs/images/icon_reload_failed.gif';
        oImg.title = 'Invalid response: ' + response;
	message_title = 'Error!';
	message_text = 'Invalid response for action '+action+' : ' + response;
    }

    var saySimple = function(){
	new Message({ 
		iconPath: "../htdocs/images/",
		icon: message_icon, 
		title: message_title, 
		message: message_text
	    }).say(); 
    }
    saySimple()


    response = null;
    validResponse = null;
    oImg = null;
}

function performAction(oLink, action, type, site, name1, name2) {
    var oImg = oLink.childNodes[0];
    oImg.src = '../htdocs/images/icon_reloading.gif';

    // Chrome and IE are not animating the gif during sync ajax request
    // So better use the async request here
    var data = new Hash({img: oImg, action: action});
    get_url('nagios_action.py?action='+action+'&site='+site+'&host='+name1+'&service='+name2,
            actionResponseHandler, data);
    oImg = null;
}

/* -----------------------------------------------------
   view editor
   -------------------------------------------------- */

function get_column_container(oImg) {
    var oNode = oImg;
    while (oNode.nodeName != "DIV")
        oNode = oNode.parentNode;
    return oNode;
}

function toggle_button(oDiv, name, display) {
    var parts = oDiv.id.split('_');
    var type  = parts[0];
    var num   = parts[2];
    var o     = document.getElementById(type+'_'+name+'_'+num);
    if (o)
        if (display)
            o.style.display = '';
        else
            o.style.display = 'none';
    o = null;
}

function column_swap_ids(o1, o2) {
    var parts = o1.id.split('_');
    var type  = parts[0];
    var num1  = parts[2];
    var num2  = o2.id.split('_')[2];

    var o1 = null, o2 = null;
    var objects = [ '', '_editor', '_up', '_down', '_label', '_link', '_tooltip' ];
    for(var i = 0,len = objects.length; key = type+objects[i]+'_', i < len; i++) {
        o1 = document.getElementById(key + num1);
        o2 = document.getElementById(key + num2);
        if(o1 && o2) {
            if(o1.id && o2.id) {
                o1.id = key + num2;
                o2.id = key + num1;
            }
            if(o1.name && o2.name) {
                o1.name = key + num2;
                o2.name = key + num1;
            }
            if(objects[i] === '_label') {
                o1.innerHTML = 'Column ' + num2 + ':'
                o2.innerHTML = 'Column ' + num1 + ':'
            }
        }
    }
    objects = null;
    o1 = null;
    o2 = null;
}

function add_view_column_handler(id, code) {
    // Can not simply add the new code to the innerHTML code of the target
    // container. So first creating a temporary container and fetch the
    // just created DOM node of the editor fields to add it to the real
    // container afterwards.
		var tmpContainer = document.createElement('div');
		tmpContainer.innerHTML = code;
		var oNewEditor = tmpContainer.lastChild;

    var oContainer = document.getElementById('ed_'+id).firstChild;
    oContainer.appendChild(oNewEditor);
		tmpContainer = null;

    if (oContainer.lastChild.previousSibling)
        fix_buttons(oContainer, oContainer.lastChild.previousSibling);
    oContainer = null;
}

function add_view_column(id, datasourcename, prefix) {
    get_url('get_edit_column.py?ds=' + datasourcename + '&pre=' + prefix
          + '&num=' + (document.getElementById('ed_'+id).firstChild.childNodes.length + 1),
            add_view_column_handler, id);
}

function delete_view_column(oImg) {
    var oNode = get_column_container(oImg);
    var oContainer = oNode.parentNode;

    var prev = oNode.previousSibling;
    var next = oNode.nextSibling;

    oContainer.removeChild(oNode);

    if (prev)
        fix_buttons(oContainer, prev);
    if (next)
        fix_buttons(oContainer, next);

    oContainer = null;
    oNode = null;
}

function fix_buttons(oContainer, oNode) {
    var num = oContainer.childNodes.length;
    if (num === 0)
        return;

    if (oContainer.firstChild == oNode)
        toggle_button(oNode, 'up', false);
    else
        toggle_button(oNode, 'up', true);
    if (oContainer.lastChild == oNode)
        toggle_button(oNode, 'down', false);
    else
        toggle_button(oNode, 'down', true);
}

function move_column_up(oImg) {
    var oNode = get_column_container(oImg);
    var oContainer = oNode.parentNode;
    
    // The column is the first one - skip moving
    if (oNode.previousSibling === null)
        return;

    oContainer.insertBefore(oNode, oNode.previousSibling);

    fix_buttons(oContainer, oNode);
    fix_buttons(oContainer, oNode.nextSibling);

    column_swap_ids(oNode, oNode.nextSibling);

    oContainer = null;
    oNode = null;
    oImg = null;
}

function move_column_down(oImg) {
    var oNode = get_column_container(oImg);
    var oContainer = oNode.parentNode;
    
    // The column is the last one - skip moving
    if (oNode.nextSibling === null)
        return;

    if (oContainer.lastChild == oNode.nextSibling)
        oContainer.appendChild(oNode);
    else
        oContainer.insertBefore(oNode, oNode.nextSibling.nextSibling);

    fix_buttons(oContainer, oNode);
    fix_buttons(oContainer, oNode.previousSibling);

    column_swap_ids(oNode, oNode.previousSibling);

    oContainer = null;
    oNode = null;
    oImg = null;
}


// ----------------------------------------------------------------------------
// page reload stuff
// ----------------------------------------------------------------------------

//Stores the reload timer object
var gReloadTimer = null;
// This stores the last refresh time of the page (But never 0)
var gReloadTime = 0;

// Highlights/Unhighlights a refresh button
function toggleRefreshButton(s, enable) {
    var o = document.getElementById('button-refresh-' + s);
    if(o) {
        if(enable) {
            o.setAttribute("className", "left w40 selected");
            o.setAttribute("class", "left w40 selected");
        } else {
            o.setAttribute("className", "left w40");
            o.setAttribute("class", "left w40");
        }
    }
    o = null;
}


// When called with one or more parameters parameters it reschedules the
// timer to the given interval. If the parameter is 0 the reload is stopped.
// When called with two parmeters the 2nd one is used as new url.
function setReload(secs, url) {
    if(typeof url === 'undefined')
        url = '';
    
    if (gReloadTimer) {
        toggleRefreshButton(0, false);
        toggleRefreshButton(gReloadTime, false);
        clearTimeout(gReloadTimer);
    }

    toggleRefreshButton(secs, true);

    if (secs !== 0) {
        gReloadTime  = secs;
        gReloadTimer = setTimeout("handleReload('" + url + "')", Math.ceil(parseFloat(secs) * 1000));
    }
}

function handleReload(url) {
    if (url === '')
        window.location.reload(false);
    else
        window.location.href = url;
}

// --------------------------------------------------------------------------
// BI
// --------------------------------------------------------------------------
var tree_anim_o = null;

function toggle_subtree(oImg) 
{
    var oParent = oImg.parentNode;
    var oSubtree = oParent.childNodes[6];
    var path_id = oSubtree.id;
    var url = "bi_save_treestate.py?path=" + escape(path_id);

    tree_anim_o = oImg;
    if (oSubtree.style.display == "none") {
        oSubtree.style.display = "";
        url += "&state=open";
        oImg.src = "images/tree_10.png";
        setTimeout("set_tree_animation_step('20');", 10);
        setTimeout("set_tree_animation_step('30');", 20);
        setTimeout("set_tree_animation_step('40');", 35);
        setTimeout("set_tree_animation_step('50');", 55);
        setTimeout("set_tree_animation_step('60');", 85);
        setTimeout("set_tree_animation_step('70');", 125);
        setTimeout("set_tree_animation_step('80');", 180);
        setTimeout("set_tree_animation_step('90');", 260);
    }
    else {
        oSubtree.style.display = "none";
        url += "&state=closed";
        oImg.src = "images/tree_80.png";
        setTimeout("set_tree_animation_step('70');", 10);
        setTimeout("set_tree_animation_step('60');", 20);
        setTimeout("set_tree_animation_step('50');", 35);
        setTimeout("set_tree_animation_step('40');", 55);
        setTimeout("set_tree_animation_step('30');", 85);
        setTimeout("set_tree_animation_step('20');", 125);
        setTimeout("set_tree_animation_step('10');", 180);
        setTimeout("set_tree_animation_step('00');", 260);
    }
    oSubtree = null;
    oParent = null;
    get_url(url);
}

function set_tree_animation_step(num)
{
    tree_anim_o.src = "images/tree_" + num + ".png";
}


function toggle_assumption(oImg, site, host, service)
{
    // get current state
    var current = oImg.src;
    while (current.indexOf('/') > -1)
        current = current.substr(current.indexOf('/') + 1);
    current = current.substr(7);
    current = current.substr(0, current.length - 4);
    if (current == 'none')
        current = '1';
    else if (current == '3')
        current = '0'
    else if (current == '0')
        current = 'none'
    else
        current = parseInt(current) + 1; 

    var url = "bi_set_assumption.py?site=" + site + '&host=' + host;
    if (service) {
        url += '&service=' + service;
    }
    url += '&state=' + current; 
    oImg.src = "images/assume_" + current + ".png";
    get_url(url);
}







/* Add for > icons a toggle root problem panel of this impact
   and hide all previously open ones 
*/
window.addEvent('domready', function(){
    
	/* Keep a pointer to the currently open problem*/
	var old_problem = null;
	/* Keep the currently click impact */
	var old_impact = null;
	/* Keep a trace of the click show problem div*/
	var old_show_pb = null;
	/* And the id of the problem */
	var current_id = 0;
  
	/* We must avoid $$() call for IE, so call a standad way*/
	var impacts = $(document.body).getElements('.impact');

	/* We must avoid $$() call for IE, so call a standad way*/
	var problems = $(document.body).getElements('.problems-panel');
  
    
	/* Activate all problems, but in invisible from now*/
	problems.setStyle('opacity', 0);


	/* Register the toggle function for all problem links*/
	var clicks = $(document.body).getElements('.pblink');
	/* And we register our toggle function */
	clicks.addEvent('click', function(){
		var pb_nb = this.get('id');
		toggleBox(pb_nb);

	    });

	function get_impact(impacts, id){
	    for(var i = 0; i< impacts.length; i++) {
		var impact = impacts[i];
		/*alert("Look for impact"+i+impact+"\n");*/
		if (impact.get('id') == id){
		    return impact;
		}
	    }
	    return none;
	}


	/* Our main toggle function */
	function toggleBox(pb_nb){
	    // Get our current impact click element
	    impact = get_impact(impacts, pb_nb);

	    // And fidn the panel we will slide
	    el = document.getElementById("problems-"+pb_nb);
	
	    if (old_show_pb != null) {
		new Fx.Tween(old_show_pb, {property: 'opacity'}).start(0);
		old_show_pb = null;
	    }
      
	    var click_same_problem = false;
	    if (old_problem == el ) {
		click_same_problem = true;
	    }

	    var toggleEffect = new Fx.Tween(el, {
		    property : 'opacity',
		    duration :500/*'short'*/
		});

	    // If we got an open problem, close it
	    if (old_problem != null && old_problem != el){
		old_problem.setStyle('left', -450);
		old_problem.setStyle('opacity', 0);
		old_problem.setStyle('display','none');
		// And clean the active impact class too
		old_impact.removeClass("impact-active");
	    }

	    old_problem = el;
	    old_impact = impact;
	    

	    /* If it was hide, it was on the left, go right and show up
	       and reverse the >> right image */
	    if(el.getStyle('opacity') == 0){
		current_id = pb_nb;
		el.setStyle('display','block');
		toggleEffect.start(0, 1); // go show by in opacity
		new Fx.Tween(el, {property: 'left', transition: 'circ:in:out'}).start(5); // and by moving right

		// Add the active class on the current impact
		impact.addClass("impact-active");
		

		/* else it was show, go left and hide :)*/
	    } else {
		current_id = 0;
		toggleEffect.start(1, 0); // go hide by opacity
		new Fx.Tween(el, {property: 'left', transition: 'circ:in:out'}).start(-450); // go left
		
		// Add the active class on the current impact
		impact.removeClass("impact-active");

	    }
	
	}
    
    
    });




/* Now a function for managingthe hovering of the problems. Will make
   appears the actiosn buttons with a smoot way (opacity)*/

window.addEvent('domready', function(){
    
    /* We must avoid $$() call for IE, so call a standad way*/
    var problems = $(document.body).getElements('.problem');
    

    // We set display actions on hover
    problems.addEvent('mouseenter', function(){
	var pb_nb = this.get('id');
	el = document.getElementById("actions-" + pb_nb);
	new Fx.Tween(el, {property: 'opacity'}).start(1);
	
    });
    // And on leaving, hide them with opacity -> 0
    problems.addEvent('mouseleave', function(){
        var pb_nb = this.get('id');
        el = document.getElementById("actions-" + pb_nb);
	new Fx.Tween(el, {property: 'opacity'}).start(0.4);
    });


});



/* Now register for images FIXIT a fitit call*/
window.addEvent('domready', function(){
    
    /* We must avoid $$() call for IE, so call a standad way*/
    var actions_fixit = $(document.body).getElements('.action-fixit');
    

    // We set display actions on hover
    actions_fixit.addEvent('click', function(){
	var args = this.get('id');
	var reg = new RegExp("[/]+", "g");
	var tab = args.split(reg);
	var action = tab[0];
	var site = tab[1];
	var host = tab[2];
	var desc = '';
	var type = 'host' ;
	// If got 4 part, it's a service
	if (tab.length == 4){
	    desc = tab[3];
	    type = 'service';
	}
	
	//alert('got tab'+tab);
	performAction(this, action, type, site, host, desc);
    });
});


/* Now register for images an ACKNO call*/
window.addEvent('domready', function(){
    
    /* We must avoid $$() call for IE, so call a standad way*/
    var actions_ack = $(document.body).getElements('.action-ack');

    // We set display actions on hover
    actions_ack.addEvent('click', function(){
	var args = this.get('id');
	var reg = new RegExp("[/]+", "g");
	var tab = args.split(reg);
	var action = tab[0];
	var site = tab[1];
	var host = tab[2];
	var desc = '';
	var type = 'host' ;
	// If got 4 part, it's a service
	if (tab.length == 4){
	    desc = tab[3];
	    type = 'service';
	}
	
	//alert('got tab'+tab);
	performAction(this, action, type, site, host, desc);

    });
});




