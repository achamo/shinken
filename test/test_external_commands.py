#!/usr/bin/env python2.6
#Copyright (C) 2009-2010 :
#    Gabes Jean, naparuba@gmail.com
#    Gerhard Lausser, Gerhard.Lausser@consol.de
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

#
# This file is used to test reading and processing of config files
#

#It's ugly I know....
from shinken_test import *
import os

class TestConfig(ShinkenTest):
    #setUp is in shinken_test

    def send_cmd(self, line):
        s = '[%d] %s\n' % (int(time.time()), line)
        print "Writing %s in %s" % (s, self.conf.command_file)
        fd = open(self.conf.command_file, 'wb')
        fd.write(s)
        fd.close()


    #Change ME :)
    def test_external_comand(self):
        now = time.time()
        host = self.sched.hosts.find_by_name("test_host_0")
        router = self.sched.hosts.find_by_name("test_router_0")
        svc = self.sched.services.find_srv_by_name_and_hostname("test_host_0", "test_ok_0")
        self.scheduler_loop(2, [[host, 0, 'UP | value1=1 value2=2'], [router, 0, 'UP | rtt=10'], [svc, 2, 'BAD | value1=0 value2=0']])
        self.assert_(host.state == 'UP')
        self.assert_(host.state_type == 'HARD')

        excmd = '[%d] PROCESS_HOST_CHECK_RESULT;test_host_0;2;Bob is not happy' % int(time.time())
        self.sched.run_external_command(excmd)
        self.scheduler_loop(1, [])
        self.scheduler_loop(1, []) #Need 2 run for get then consume)
        self.assert_(host.state == 'DOWN')
        self.assert_(host.output == 'Bob is not happy')

        # Now with performance data
        excmd = '[%d] PROCESS_HOST_CHECK_RESULT;test_host_0;2;Bob is not happy|rtt=9999' % int(time.time())
        self.sched.run_external_command(excmd)
        self.scheduler_loop(1, [])
        self.scheduler_loop(1, []) #Need 2 run for get then consume)
        self.assert_(host.state == 'DOWN')
        self.assert_(host.output == 'Bob is not happy')
        self.assert_(host.perf_data == 'rtt=9999')

        # Now with full-blown performance data. Here we have to watch out:
        # Is a ";" a separator for the external command or is it
        # part of the performance data?
        excmd = '[%d] PROCESS_HOST_CHECK_RESULT;test_host_0;2;Bob is not happy|rtt=9999;5;10;0;10000' % int(time.time())
        self.sched.run_external_command(excmd)
        self.scheduler_loop(1, [])
        self.scheduler_loop(1, []) #Need 2 run for get then consume)
        self.assert_(host.state == 'DOWN')
        self.assert_(host.output == 'Bob is not happy')
        print "perf (%s)" % host.perf_data
        self.assert_(host.perf_data == 'rtt=9999;5;10;0;10000')

        # The same with a service
        excmd = '[%d] PROCESS_SERVICE_CHECK_RESULT;test_host_0;test_ok_0;1;Bobby is not happy|rtt=9999;5;10;0;10000' % int(time.time())
        self.sched.run_external_command(excmd)
        self.scheduler_loop(1, [])
        self.scheduler_loop(1, []) #Need 2 run for get then consume)
        self.assert_(svc.state == 'WARNING')
        self.assert_(svc.output == 'Bobby is not happy')
        print "perf (%s)" % svc.perf_data
        self.assert_(svc.perf_data == 'rtt=9999;5;10;0;10000')

        #Clean the command_file
        #try:
        #    os.unlink(self.conf.command_file)
        #except :
        #    pass


if __name__ == '__main__':
    unittest.main()

