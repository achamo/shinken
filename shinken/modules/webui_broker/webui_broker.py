#!/usr/bin/env python
#Copyright (C) 2009-2010 :
#    Gabes Jean, naparuba@gmail.com
#    Gerhard Lausser, Gerhard.Lausser@consol.de
#    Gregory Starck, g.starck@gmail.com
#    Hartmut Goebel, h.goebel@goebel-consult.de
#
#This file is part of Shinken.
#
#Shinken is free software: you can redistribute it and/or modify
#it under the terms of the GNU Affero General Public License as published by
#the Free Software Foundation, either version 3 of the License, or
#(at your option) any later version.
#
#Shinken is distributed in the hope that it will be useful,
#but WITHOUT ANY WARRANTY; without even the implied warranty of
#MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#GNU Affero General Public License for more details.
#
#You should have received a copy of the GNU Affero General Public License
#along with Shinken.  If not, see <http://www.gnu.org/licenses/>.


"""
This Class is a plugin for the Shinken Broker. It is in charge
to get brok and recreate real objects, and propose a Web intnerface :)
"""

import traceback
import sys
import os
import time
import traceback
import select
import threading


from shinken.basemodule import BaseModule
from shinken.message import Message
from shinken.webui.bottle import Bottle, run, static_file, view, route
from shinken.misc.regenerator import Regenerator
from shinken.log import logger
from datamanager import datamgr
from helper import helper

# Debug
import shinken.webui.bottle as bottle
bottle.debug(True)

#Import bottle lib to make bottle happy
bottle_dir = os.path.abspath(os.path.dirname(bottle.__file__))
sys.path.insert(0, bottle_dir)


bottle.TEMPLATE_PATH.append(os.path.join(bottle_dir, 'views'))
bottle.TEMPLATE_PATH.append(bottle_dir)



#Class for the Merlindb Broker
#Get broks and puts them in merlin database
class Webui_broker(BaseModule):
    def __init__(self, modconf):
        BaseModule.__init__(self, modconf)

        self.plugins = []

        self.port = int(getattr(modconf, 'port', '8080'))
        self.host = getattr(modconf, 'host', '0.0.0.0')

        self.rg = Regenerator()
        self.datamgr = datamgr
        datamgr.load(self.rg)
        self.helper = helper



    # Called by Broker so we can do init stuff
    # TODO : add conf param to get pass with init
    # Conf from arbiter!
    def init(self):
        print "Init of the Webui '%s'" % self.name



    def main(self):
        try:
            #import cProfile
            #cProfile.runctx('''self.do_main()''', globals(), locals(),'/tmp/livestatus.profile')
            self.do_main()
        except Exception, exp:            
            msg = Message(id=0, type='ICrash', data={'name' : self.get_name(), 'exception' : exp, 'trace' : traceback.format_exc()})
            self.from_q.put(msg)
            # wait 2 sec so we know that the broker got our message, and die
            time.sleep(2)
            raise


    # A plugin send us en external command. We just put it
    # in the good queue
    def push_external_command(self, e):
        print "WebUI: got an external command", e.__dict__
        self.from_q.put(e)
        

    # Real main function
    def do_main(self):
        #I register my exit function
        self.set_exit_handler()
        print "Go run"

        self.global_lock = threading.RLock()
        self.data_thread = None

        # Check if the view dir really exist
        if not os.path.exists(bottle.TEMPLATE_PATH[0]):
            logger.log('ERROR : the view path do not exist at %s' % bottle.TEMPLATE_PATH)
            sys.exit(2)

        self.load_plugins()

        # Declare the whole app static files AFTER the plugin ones
        self.declare_common_static()
        
        
        
        print "Starting WebUI application"
        srv = run(host=self.host, port=self.port, server='wsgirefselect')
        print "Launch server", srv

        # Launch the data thread"
        self.data_thread = threading.Thread(None, self.manage_brok_thread, 'datathread')
        self.data_thread.start()
        # TODO : look for alive and killing


        # Main blocking loop
        while True:
            # Ok, you want to know why we are using a data thread instead of
            # just call for a select with q._reader, the underliying file 
            # handle of the Queue()? That's just because under Windows, select
            # only manage winsock (so network) file descriptor! What a shame!
            input = [srv.socket]
            inputready,_,_ = select.select(input,[],[], 1)
            for s in inputready:
                # If it's a web request, ask the webserver to do it
                if s == srv.socket:
                    print "Handle Web request"
                    # We are not managing the lock at this
                    # level because we got 2 types of requests:
                    # static images/css/js : no need for lock
                    # pages : need it. So it's managed at a
                    # function wrapper at loading pass
                    srv.handle_request()

                    
    # It's the thread function that will get broks
    # and update data. Will lock the whole thing
    # while updating
    def manage_brok_thread(self):
        print "Data thread started"
        while True:
           b = self.to_q.get()
           print "Got a brok"
           # For updating, we cannot do it while
           # answer queries, so lock it
           self.global_lock.acquire()
           try:
              print "Got data lock, manage brok"
              self.rg.manage_brok(b)
           finally:
              print "Release data lock"
              self.global_lock.release()


    # Here we will load all plugins (pages) under the webui/plugins
    # directory. Each one can have a page, views and htdocs dir that we must
    # route correctly
    def load_plugins(self):
        from shinken.webui import plugins
        plugin_dir = os.path.abspath(os.path.dirname(plugins.__file__))
        print "Loading plugin directory : %s" % plugin_dir
        
        # Load plugin directories
        plugin_dirs = [ fname for fname in os.listdir(plugin_dir)
                        if os.path.isdir(os.path.join(plugin_dir, fname)) ]

        print "Plugin dirs", plugin_dirs
        sys.path.append(plugin_dir)
        # We try to import them, but we keep only the one of
        # our type
        for fdir in plugin_dirs:
            print "Try to load", fdir
            mod_path = 'shinken.webui.plugins.%s.%s' % (fdir, fdir)
            try:
                m = __import__(mod_path, fromlist=[mod_path])
                m_dir = os.path.abspath(os.path.dirname(m.__file__))
                sys.path.append(m_dir)

                print "Loaded module m", m
                print m.__file__
                pages = m.pages
                print "Try to load pages", pages
                for (f, entry) in pages.items():
                    routes = entry.get('routes', None)
                    v = entry.get('view', None)
                    static = entry.get('static', False)

                    # IMPORTANT : apply VIEW BEFORE route!
                    if v:
                        print "Link function", f, "and view", v
                        f = view(v)(f)

                    # Maybe there is no route to link, so pass
                    if routes:
                        for r in routes:
                            print "link function", f, "and route", r
                            # Ok, we will just use the lock for all
                            # plugin page, but not for static objects
                            # so we set the lock at the function level.
                            lock_version = self.lockable_function(f)
                            f = route(r, callback=lock_version)
                            
                    # If the plugin declare a static entry, register it
                    # and remeber : really static! because there is no lock
                    # for them!
                    if static:
                        self.add_static(fdir, m_dir)

                # And we add the views dir of this plugin in our TEMPLATE
                # PATH
                bottle.TEMPLATE_PATH.append(os.path.join(m_dir, 'views'))

                # And finally register me so the pages can get data and other
                # useful stuff
                m.app = self
                        
                        
            except Exception, exp:
                logger.log("Warning in loading plugins : %s" % exp)



    def add_static(self, fdir, m_dir):
        static_route = '/static/'+fdir+'/:path#.+#'
        print "Declaring static route", static_route
        def plugin_static(path):
            print "Ask %s and give %s" % (path, os.path.join(m_dir, 'htdocs'))
            return static_file(path, root=os.path.join(m_dir, 'htdocs'))
        route(static_route, callback=plugin_static)


    # We want a lock manager version of the plugin fucntions
    def lockable_function(self, f):
        print "We create a lock verion of", f
        def lock_version(**args):
            t = time.time()
            print "Got HTTP lock for f", f
            self.global_lock.acquire()
            try:
                return f(**args)
            finally:
                print "Release HTTP lock for f", f
                print "in", time.time() - t
                self.global_lock.release()
        print "The lock version is", lock_version
        return lock_version


    def declare_common_static(self):
        # Route static files css files
        @route('/static/:path#.+#')
        def server_static(path):
            return static_file(path, root=os.path.join(bottle_dir, 'htdocs'))

        # And add teh favicon ico too
        @route('/favicon.ico')
        def give_favicon():
            return static_file('favicon.ico', root=os.path.join(bottle_dir, 'htdocs', 'images'))
