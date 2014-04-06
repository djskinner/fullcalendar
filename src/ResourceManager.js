
fc.sourceNormalizers = [];
fc.sourceFetchers = [];

var ajaxDefaults = {
	dataType: 'json',
	cache: false
};

var resourceGUID = 1;


function ResourceManager(options, _sources) {
	var t = this;
	
	
	// exports
	t.fetchResources = fetchResources;
	t.addResourceSource = addResourceSource;
	t.removeResourceSource = removeResourceSource;
	t.updateResource = updateResource;
	t.removeResources = removeResources;
	t.clientResources = clientResources;
	t.normalizeResource = normalizeResource;
	
	
	// imports
	var trigger = t.trigger;
	var getView = t.getView;
	var reportResources = t.reportResources;
	
	
	// locals
	var stickySource = { resources: [] };
	var sources = [ stickySource ];
	var rangeStart, rangeEnd;
	var currentFetchID = 0;
	var pendingSourceCnt = 0;
	var loadingLevel = 0;
	var cache = [];
	
	
	for (var i=0; i<_sources.length; i++) {
		_addResourceSource(_sources[i]);
	}
	
	
	
	/* Fetching
	-----------------------------------------------------------------------------*/
	
	
	function fetchResources() {
		cache = [];
		var fetchID = ++currentFetchID;
		var len = sources.length;
		pendingSourceCnt = len;
		for (var i=0; i<len; i++) {
			fetchResourceSource(sources[i], fetchID);
		}
	}
	
	
	function fetchResourceSource(source, fetchID) {
		_fetchResourceSource(source, function(resources) {
			if (fetchID == currentFetchID) {
				if (resources) {

					if (options.resourceDataTransform) {
						resources = $.map(resources, options.resourceDataTransform);
					}
					if (source.resourceDataTransform) {
						resources = $.map(resources, source.resourceDataTransform);
					}
					// TODO: this technique is not ideal for static array resource sources.
					//  For arrays, we'll want to process all resources right in the beginning, then never again.
				
					for (var i=0; i<resources.length; i++) {
						resources[i].source = source;
						normalizeResource(resources[i]);
					}
					cache = cache.concat(resources);
				}
				pendingSourceCnt--;
				if (!pendingSourceCnt) {
					reportResources(cache);
				}
			}
		});
	}
	
	
	function _fetchResourceSource(source, callback) {
		var i;
		var fetchers = fc.sourceFetchers;
		var res;
		for (i=0; i<fetchers.length; i++) {
			res = fetchers[i](source, rangeStart, rangeEnd, callback);
			if (res === true) {
				// the fetcher is in charge. made its own async request
				return;
			}
			else if (typeof res == 'object') {
				// the fetcher returned a new source. process it
				_fetchResourceSource(res, callback);
				return;
			}
		}
		var resources = source.resources;
		if (resources) {
			if ($.isFunction(resources)) {
				pushLoading();
				resources(function(resources) {
					callback(resources);
					popLoading();
				});
			}
			else if ($.isArray(resources)) {
				callback(resources);
			}
			else {
				callback();
			}
		}else{
			var url = source.url;
			if (url) {
				var success = source.success;
				var error = source.error;
				var complete = source.complete;

				// retrieve any outbound GET/POST $.ajax data from the options
				var customData;
				if ($.isFunction(source.data)) {
					// supplied as a function that returns a key/value object
					customData = source.data();
				}
				else {
					// supplied as a straight key/value object
					customData = source.data;
				}

				// use a copy of the custom data so we can modify the parameters
				// and not affect the passed-in object.
				var data = $.extend({}, customData || {});

				var startParam = firstDefined(source.startParam, options.startParam);
				var endParam = firstDefined(source.endParam, options.endParam);
				if (startParam) {
					data[startParam] = Math.round(+rangeStart / 1000);
				}
				if (endParam) {
					data[endParam] = Math.round(+rangeEnd / 1000);
				}

				pushLoading();
				$.ajax($.extend({}, ajaxDefaults, source, {
					data: data,
					success: function(resources) {
						resources = resources || [];
						var res = applyAll(success, this, arguments);
						if ($.isArray(res)) {
							resources = res;
						}
						callback(resources);
					},
					error: function() {
						applyAll(error, this, arguments);
						callback();
					},
					complete: function() {
						applyAll(complete, this, arguments);
						popLoading();
					}
				}));
			}else{
				callback();
			}
		}
	}
	
	
	
	/* Sources
	-----------------------------------------------------------------------------*/
	

	function addResourceSource(source) {
		source = _addResourceSource(source);
		if (source) {
			pendingSourceCnt++;
			fetchResourceSource(source, currentFetchID); // will eventually call reportResources
		}
	}
	
	
	function _addResourceSource(source) {
		if ($.isFunction(source) || $.isArray(source)) {
			source = { resources: source };
		}
		else if (typeof source == 'string') {
			source = { url: source };
		}
		if (typeof source == 'object') {
			normalizeSource(source);
			sources.push(source);
			return source;
		}
	}
	

	function removeResourceSource(source) {
		sources = $.grep(sources, function(src) {
			return !isSourcesEqual(src, source);
		});
		// remove all client resources from that source
		cache = $.grep(cache, function(e) {
			return !isSourcesEqual(e.source, source);
		});
		reportResources(cache);
	}
	
	
	
	/* Manipulation
	-----------------------------------------------------------------------------*/
	
	
	function updateResource(resource) { // update an existing resource
		var i, len = cache.length, e;
		for (i=0; i<len; i++) {
			e = cache[i];
			if (e._id == resource._id && e != resource) {
				e.name = resource.name;
				e.readonly = resource.readonly;
				normalizeResource(e);
			}
		}
		normalizeResource(resource);
		reportResources(cache);
	}
	
	function removeResources(filter) {
		if (!filter) { // remove all
			cache = [];
			// clear all array sources
			for (var i=0; i<sources.length; i++) {
				if ($.isArray(sources[i].resources)) {
					sources[i].resources = [];
				}
			}
		}else{
			if (!$.isFunction(filter)) { // a resource ID
				var id = filter + '';
				filter = function(e) {
					return e._id == id;
				};
			}
			cache = $.grep(cache, filter, true);
			// remove resources from array sources
			for (var i=0; i<sources.length; i++) {
				if ($.isArray(sources[i].resources)) {
					sources[i].resources = $.grep(sources[i].resources, filter, true);
				}
			}
		}
		reportResources(cache);
	}
	
	
	function clientResources(filter) {
		if ($.isFunction(filter)) {
			return $.grep(cache, filter);
		}
		else if (filter) { // a resource ID
			filter += '';
			return $.grep(cache, function(e) {
				return e._id == filter;
			});
		}
		return cache; // else, return all
	}
	
	
	
	/* Loading State
	-----------------------------------------------------------------------------*/
	
	
	function pushLoading() {
		if (!loadingLevel++) {
			trigger('loading', null, true, getView());
		}
	}
	
	
	function popLoading() {
		if (!--loadingLevel) {
			trigger('loading', null, false, getView());
		}
	}
	
	
	
	/* Resource Normalization
	-----------------------------------------------------------------------------*/
	
	
	function normalizeResource(resource) {
		var source = resource.source || {};
		resource._id = resource._id || (resource.id === undefined ? '_fc' + resourceGUID++ : resource.id + '');

		if (resource.className) {
			if (typeof resource.className == 'string') {
				resource.className = resource.className.split(/\s+/);
			}
		}else{
			resource.className = [];
		}
		// TODO: if there is no id, return false to indicate an invalid resource
	}
	
	
	
	/* Utils
	------------------------------------------------------------------------------*/
	
	
	function normalizeSource(source) {
		if (source.className) {
			// TODO: repeat code, same code for resources classNames
			if (typeof source.className == 'string') {
				source.className = source.className.split(/\s+/);
			}
		}else{
			source.className = [];
		}
		var normalizers = fc.sourceNormalizers;
		for (var i=0; i<normalizers.length; i++) {
			normalizers[i](source);
		}
	}
	
	
	function isSourcesEqual(source1, source2) {
		return source1 && source2 && getSourcePrimitive(source1) == getSourcePrimitive(source2);
	}
	
	
	function getSourcePrimitive(source) {
		return ((typeof source == 'object') ? (source.resources || source.url) : '') || source;
	}


}
