
FullCalendar - Resource Calendar Fork
====================================================

Adds ResourceDay Agenda view with minimal changes to fullCalendar.

Forked from 1.6.4 works well with the angular js directive too.

See here for a plunker.

The following are known to not work, not fully work, or are untested:

- overlapping events
- all day events
- dragging
- resizing

Events need event.resource which equals the resource._id

Resources work similarly to events with multiple resource sources

      resourceSources: [
        {
          resources: function (callback) {
            Pitches.query().$promise.then(function(pitches) {
              callback(pitches);
            });
          },
            // [{"name":"Resource 2","_id":"resource2"},{"name":"Resource 1","_id":"resource1"}],
          resourceDataTransform: function(resource) {
            var copy = $.extend({}, resource);
            copy.id = copy._id;
            return copy;
          }
        }
      ],

resourceDataTransform, addResourceSource, updateResource etc.. **should** work.

Here's another example:

<script type='text/javascript'>

	$(document).ready(function() {
	
		var date = new Date();
		var d = date.getDate();
		var m = date.getMonth();
		var y = date.getFullYear();
		
		var calendar = $('#calendar').fullCalendar({
			header: {
				left: 'prevYear, prev,next today, nextYear',
				center: 'title',
				right: 'agendaDay,resourceDay'
			},
			defaultView: 'resourceDay',
			firstDay: 1, 	
			editable: true,
			selectable: true,
			minTime: 8,
			snapMinutes:60,
			maxTime:23,
			selectHelper: true,
			resourceSources: [
				{
					resources: [{"name":"Resource 2","_id":"resource2"},{"name":"Resource 1","_id":"resource1"}]
				}
			],
			refetchResources:true,
			events: [		
				{
					title: 'Meeting from this day to this +4',
					start: new Date(y, m, d, 10, 30),
					end: new Date(y, m, d, 11, 00),
					resource: 'resource1',
					allDay: false
				},	
				{
					title: 'Meeting last week',
					start: new Date(y, m, d, 12, 30),
					end: new Date(y, m, d, 13, 00),
					resource: 'resource1',
					allDay: false
				},	
				{
					title: 'meeting tomorrow',
					start: new Date(y, m, d, 10, 30),
					end: new Date(y, m, d, 12, 00),
					resource: 'resource1',
					allDay: false
				},	
				{
					title: 'meeting tomorrow',
					start: new Date(y, m, d, 10, 30),
					end: new Date(y, m, d, 12, 00),
					resource: 'resource2',
					allDay: false
				}	
			],
			select: function(start, end, allDay, jsEvent, view, resource) {
				var title = prompt('event title:');

				if (title) {
					calendar.fullCalendar('renderEvent',
						{
							title: title,
							start: start,
							end: end,
							allDay: allDay,
							resource: resource.id
						},
						true // make the event "stick"
					);
				}
				calendar.fullCalendar('unselect');
			},
			resourceRender: function(resource, element, view) {
				// this is triggered when the resource is rendered, just like eventRender
			},
			eventDrop: function( event, dayDelta, minuteDelta, allDay, revertFunc, jsEvent, ui, view ) { 
				alert('event moved to '+event.start+' to '+event.resource);
			},
			eventResize: function( event, dayDelta, minuteDelta, revertFunc, jsEvent, ui, view ) { 
				alert('event was resized, new endtime: '+event.end);
			},
			eventClick: function ( event, jsEvent, view )  {
				alert('event '+event.title+' was left clicked');
			}
		});
	});

</script>

Thanks to jmourlakin who i based this work off.




FullCalendar - Full-sized drag & drop event calendar
====================================================

This document describes how to modify or contribute to the FullCalendar project. If you are looking for end-developer documentation, please visit the [project homepage][fc-homepage].


Getting Set Up
--------------

You will need [Git][git], [Node][node], and NPM installed. For clarification, please view the [jQuery readme][jq-readme], which requires a similar setup.

Also, you will need the [grunt-cli][grunt-cli] and [bower][bower] packages installed globally (`-g`) on your system:

	npm install -g grunt-cli bower

Then, clone FullCalendar's git repo:

	git clone git://github.com/arshaw/fullcalendar.git

Enter the directory and install FullCalendar's development dependencies:

	cd fullcalendar && npm install


Development Workflow
--------------------

After you make code changes, you'll want to compile the JS/CSS so that it can be previewed from the tests and demos. You can either manually rebuild each time you make a change:

	grunt dev

Or, you can run a script that automatically rebuilds whenever you save a source file:

	./build/watch

You can optionally add the `--sourceMap` flag to output source maps for debugging.

When you are finished, run the following command to write the distributable files into the `./build/out/` and `./build/dist/` directories:

	grunt

If you want to clean up the generated files, run:

	grunt clean


Writing Tests
-------------

When fixing a bug or writing a feature, please make a corresponding HTML file in the `./tests/` directory to visually demonstrate your work. If the test requires user intervention to prove its point, please write instructions for the user to follow. Explore the existing tests for more info.


[fc-homepage]: http://arshaw.com/fullcalendar/
[git]: http://git-scm.com/
[node]: http://nodejs.org/
[grunt-cli]: http://gruntjs.com/getting-started#installing-the-cli
[bower]: http://bower.io/
[jq-readme]: https://github.com/jquery/jquery/blob/master/README.md#what-you-need-to-build-your-own-jquery