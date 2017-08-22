'use strict';

define(['angular', 'ol', 'sidebar', 'toolbar', 'layermanager', 'SparqlJson', 'map', 'query', 'search', 'print', 'permalink', 'measure', 'legend', 'geolocation', 'core', 'api', 'angular-gettext', 'bootstrap', 'translations', 'compositions', 'status_creator', 'ows'],

    function(angular, ol, sidebar, toolbar, layermanager, SparqlJson) {
        var module = angular.module('hs', [
            'hs.toolbar',
            'hs.layermanager',
            'hs.map',
            'hs.query',
            'hs.search', 'hs.permalink', 'hs.measure',
            'hs.geolocation', 'hs.core',
            'hs.api',
            'gettext',
            'hs.sidebar'
        ]);

        module.directive('hs', ['hs.map.service', 'Core', function(OlMap, Core) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    Core.fullScreenMap(element);
                }
            };
        }]);
        
         var style = function(feature, resolution) {
            if (typeof feature.get('visible') === 'undefined' || feature.get('visible') == true) {
                var s = feature.get('http://www.sdi4apps.eu/poi/#mainCategory');

                if (typeof s === 'undefined') return;
                s = s.split("#")[1];
                return [
                    new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 1],
                            src: 'hslayers-ng/examples/geosparql/symbolsWaze/' + s + '.png',
                            crossOrigin: 'anonymous',
                            scale: 0.6
                        })
                    })

                ]
            } else {
                return [];
            }
        }

        var styleOSM = function(feature, resolution) {
            if (typeof feature.get('visible') === 'undefined' || feature.get('visible') == true) {
                var s = feature.get('http://www.sdi4apps.eu/poi/#mainCategory');
                if (typeof s === 'undefined') return;
                s = s.split("#")[1];
                return [
                    new ol.style.Style({
                        image: new ol.style.Icon({
                            anchor: [0.5, 1],
                            src: 'hslayers-ng/examples/geosparql/symbols/' + s + '.png',
                            crossOrigin: 'anonymous',
                            scale: 0.6
                        })
                    })
                ]
            } else {
                return [];
            }
        }
        
        
        function rainbow(numOfSteps, step, opacity) {
            // based on http://stackoverflow.com/a/7419630
            // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distiguishable vibrant markers in Google Maps and other apps.
            // Adam Cole, 2011-Sept-14
            // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
            var r, g, b;
            var h = step / (numOfSteps * 1.00000001);
            var i = ~~(h * 4);
            var f = h * 4 - i;
            var q = 1 - f;
            switch (i % 4) {
                case 2:
                    r = f, g = 1, b = 0;
                    break;
                case 0:
                    r = 0, g = f, b = 1;
                    break;
                case 3:
                    r = 1, g = q, b = 0;
                    break;
                case 1:
                    r = 0, g = 1, b = q;
                    break;
            }
            var c = "rgba(" + ~~(r * 235) + "," + ~~(g * 235) + "," + ~~(b * 235) + ", " + opacity + ")";
            return (c);
        }
        
        var stroke = new ol.style.Stroke({
            color: '#3399CC',
            width: 1.25
        });
        var olu_style = function(feature, resolution) {
            var poi_count = feature.get('poi_count');
            if(poi_count > 30) poi_count = 30;
            var fill = new ol.style.Fill({
                color: rainbow(30, poi_count, 0.7)
            });
            return [
                new ol.style.Style({
                    image: new ol.style.Circle({
                    fill: fill,
                    stroke: stroke,
                    radius: 5
                    }),
                    fill: fill,
                    stroke: stroke
                })
            ];
        }
       
        var mercatorProjection = ol.proj.get('EPSG:900913');

        module.value('config', {
            default_layers: [new ol.layer.Tile({
                    source: new ol.source.OSM({
                        wrapX: false
                    }),
                    title: "Base layer",
                    base: true
                })],
            //project_name: 'hslayers',
            default_view: new ol.View({
                center: ol.proj.transform([17.474129, 52.574000], 'EPSG:4326', 'EPSG:3857'), //Latitude longitude    to Spherical Mercator
                zoom: 5,
                units: "m"
            })
        });

        module.controller('Main', ['$scope', 'Core', 'hs.query.service_infopanel', 'hs.compositions.service_parser', '$timeout', 'hs.map.service', '$http', 'config', '$rootScope', 'hs.utils.service',
            function($scope, Core, InfoPanelService, composition_parser, $timeout, hsMap, $http, config, $rootScope, utils ) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;
                Core.sidebarExpanded = false;
                var map;
                
                $rootScope.$on('map.loaded', function(){
                    map = hsMap.map;
                    map.on('moveend', extentChanged);
                });

                var spoi_source =  new ol.source.Vector();
            
                function createPoiLayers() {
                    
                     var new_lyr = new ol.layer.Vector({
                        title: "Land use parcels",
                        source: spoi_source,
                        style: olu_style,
                        visible: true,
                        maxResolution: 2.48657133911758
                    });
                     
                    config.default_layers.push(new_lyr);
                }
                
                createPoiLayers();
             
                function extentChanged(){
                    console.log('Resolution', map.getView().getResolution());
                    if(map.getView().getResolution() > 2.48657133911758) return;
                    var format = new ol.format.WKT();
                    var bbox = map.getView().calculateExtent(map.getSize());
                    var ext = ol.proj.transformExtent(bbox, 'EPSG:3857', 'EPSG:4326')
                    var extents = ext[0] + ' ' + ext[1] + ', ' +ext[2] + ' ' + ext[3];
                    var q = 'https://www.foodie-cloud.org/sparql?default-graph-uri=&query=' + encodeURIComponent('PREFIX geo: <http://www.opengis.net/ont/geosparql#> PREFIX geof: <http://www.opengis.net/def/function/geosparql/> PREFIX virtrdf: <http://www.openlinksw.com/schemas/virtrdf#> PREFIX poi: <http://www.openvoc.eu/poi#> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?o ?use ?wkt (COUNT(*) as ?poi_count) FROM <http://www.sdi4apps.eu/poi.rdf> WHERE { ?Resource poi:class ?POI_Class . ?Resource geo:asWKT ?Coordinates . FILTER(bif:st_intersects (?Coordinates, ?wkt)). { SELECT ?o ?wkt ?use FROM <http://w3id.org/foodie/olu#> WHERE { ?o geo:hasGeometry ?geometry. ?geometry geo:asWKT ?wkt. FILTER(bif:st_intersects(bif:st_geomfromtext("BOX(' + extents + ')"), ?wkt)). ?o <http://w3id.org/foodie/olu#specificLandUse> ?use. } } }') + '&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';
                    
                    spoi_source.set('loaded', false);
                    $.ajax({
                        url: utils.proxify(q)
                    })
                    .done(function(response) {
                            if(angular.isUndefined(response.results)) return;
                            var features = [];
                            for (var i = 0; i < response.results.bindings.length; i++) {
                                try {
                                    var b = response.results.bindings[i];
                                    if(b.wkt.datatype=="http://www.openlinksw.com/schemas/virtrdf#Geometry" && b.wkt.value.indexOf('e+') == -1 && b.wkt.value.indexOf('e-') == -1){
                                        var g_feature = format.readFeature(b.wkt.value.toUpperCase());
                                        var ext = g_feature.getGeometry().getExtent()
                                        var geom_transformed = g_feature.getGeometry().transform('EPSG:4326', hsMap.map.getView().getProjection());
                                        var feature = new ol.Feature({geometry: geom_transformed, parcel: b.o.value, use: b.use.value, poi_count: b.poi_count.value});
                                        features.push(feature);
                                    }
                                } catch(ex){
                                    console.log(ex);
                                }
                            }
                        spoi_source.clear();
                        spoi_source.addFeatures(features);
                        spoi_source.set('loaded', true);
                    })

                }
                
                $scope.$on('infopanel.updated', function(event) {
                    if (console) console.log('Attributes', InfoPanelService.attributes, 'Groups', InfoPanelService.groups);
                });
                
                Core.panelEnabled('compositions', false);
                Core.panelEnabled('status_creator', false);
            }
        ]);

        return module;
    });
