'use strict';

var hsl_path = '../../';

var gitsha = Math.random(); $.ajax({
    type: "GET",
    dataType: 'text',
    url: hsl_path + 'gitsha.js',
    async: false,
    success: function(r){gitsha = r}
});

require.config({
    urlArgs: 'bust=' + gitsha,
    paths: {
        toolbar: hsl_path + 'components/toolbar/toolbar',
        layermanager: hsl_path + 'components/layermanager/layermanager',
        ows: hsl_path + 'components/ows/ows',
        'ows.wms': hsl_path + 'components/ows/ows_wms',
        'ows.wfs': hsl_path + 'components/ows/ows_wfs',
        'ows.nonwms': hsl_path + 'components/ows/ows_nonwms',
        'ows.wmsprioritized': hsl_path + 'components/ows/ows_wmsprioritized',
        query: hsl_path + 'components/query/query',
        search: hsl_path + 'components/search/search',
        print: hsl_path + 'components/print/print',
        permalink: hsl_path + 'components/permalink/permalink',
        geolocation: hsl_path + 'components/geolocation/geolocation',
        measure: hsl_path + 'components/measure/measure',
        legend: hsl_path + 'components/legend/legend',
        app: 'app',
        core: hsl_path + 'components/core/core',
        api: hsl_path + 'components/api/api',
        translations: hsl_path + 'components/translations/js/translations',
        pilsentraffic: hsl_path + 'examples/pilsen_traffic/pilsentraffic',
        ol: hsl_path + 'node_modules/openlayers/dist/ol-debug',
        calendar: hsl_path + 'examples/pilsen_traffic/calendar',
        moment: hsl_path + 'node_modules/moment/min/moment.min',
        ngtimeline: hsl_path + 'bower_components/angular-timelinejs3/dist/js/ng-timeline',
        timeline: hsl_path + 'bower_components/TimelineJS3/compiled/js/timeline'
    },
    shim: {
        d3: {
            exports: 'd3'
        },
        dc: {
            deps: ['d3', 'crossfilter']
        },
        s4a: {
            deps: ['ol', 'dc'],
            exports: 's4a'
        },
        ngtimeline: {
            deps: ['timeline']
        }
    }
});

window.name = "NG_DEFER_BOOTSTRAP!";

require(['core'], function(app) {
    require(['app'], function(app) {
        var $html = angular.element(document.getElementsByTagName('html')[0]);
        angular.element().ready(function() {
            angular.resumeBootstrap([app['name']]);
        });
    });
});
